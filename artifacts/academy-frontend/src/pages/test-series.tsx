import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

type TestSeries = {
  id: string;
  _id?: string;
  title: string;
  type?: string;
  batchId?: string | { id?: string; _id?: string; name?: string };
  batch?: {
    id?: string;
    _id?: string;
    name?: string;
  };
  batchName?: string;
  testDate?: string;
  date?: string;
  status?: "scheduled" | "ongoing" | "completed" | string;
  instructions?: string;
  tests?: TestItem[];
  testCount?: number;
  subjectCount?: number;
  createdAt?: string;
};

type TestItem = {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  subjectId?: string | { id?: string; _id?: string; name?: string };
  subject?: {
    id?: string;
    _id?: string;
    name?: string;
  };
  subjectName?: string;
  totalMarks?: number;
  maxMarks?: number;
  passingMarks?: number;
  date?: string;
  status?: string;
};

type Batch = {
  id?: string;
  _id?: string;
  name?: string;
  courseId?: string;
  course?: {
    id?: string;
    _id?: string;
    name?: string;
  };
};

type Course = {
  id?: string;
  _id?: string;
  name?: string;
};

type ApiResponse = {
  data?: unknown;
  items?: unknown;
  results?: unknown;
  series?: unknown;
};

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "";

function getToken() {
  return (
    localStorage.getItem("coach_sutra_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function getId(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    const item = value as Record<string, unknown>;

    if (typeof item.id === "string") return item.id;
    if (typeof item._id === "string") return item._id;
  }

  return "";
}

function getName(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    const item = value as Record<string, unknown>;

    if (typeof item.name === "string") return item.name;
    if (typeof item.title === "string") return item.title;
  }

  return "";
}

function normalizeSeries(item: any): TestSeries {
  const batchId = getId(item?.batchId) || getId(item?.batch);

  const tests =
    Array.isArray(item?.tests)
      ? item.tests
      : Array.isArray(item?.papers)
        ? item.papers
        : [];

  return {
    ...item,
    id: getId(item) || String(item?._id || ""),
    title:
      item?.title ||
      item?.name ||
      "Untitled Test Series",
    type: item?.type || "weekly-test",
    batchId,
    batchName:
      item?.batchName ||
      getName(item?.batch) ||
      getName(item?.batchId) ||
      "Batch",
    testDate:
      item?.testDate ||
      item?.date ||
      "",
    status: item?.status || "scheduled",
    instructions: item?.instructions || "",
    tests: tests.map((test: any) => ({
      ...test,
      id: getId(test) || String(test?._id || ""),
      name: test?.name || test?.title || "Test",
      subjectName:
        test?.subjectName ||
        getName(test?.subject) ||
        getName(test?.subjectId) ||
        "Subject",
      totalMarks:
        Number(test?.totalMarks ?? test?.maxMarks ?? 0),
      passingMarks:
        Number(test?.passingMarks ?? 0),
    })),
    testCount:
      Number(item?.testCount ?? item?.testsCount ?? tests.length),
    subjectCount:
      Number(item?.subjectCount ?? tests.length),
  };
}

function formatDate(date?: string) {
  if (!date) return "Date not set";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function typeLabel(type?: string) {
  if (!type) return "Test";

  return type
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusClasses(status?: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "ongoing":
      return "bg-blue-50 text-blue-700 border-blue-200";

    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";

  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" && body
        ? body.error || body.message
        : body;

    throw new Error(
      typeof message === "string"
        ? message
        : `Request failed with status ${response.status}`,
    );
  }

  return body as T;
}

function extractArray<T>(response: ApiResponse | T[]): T[] {
  if (Array.isArray(response)) return response as T[];

  if (Array.isArray(response?.data)) {
    return response.data as T[];
  }

  if (Array.isArray(response?.items)) {
    return response.items as T[];
  }

  if (Array.isArray(response?.results)) {
    return response.results as T[];
  }

  if (Array.isArray(response?.series)) {
    return response.series as T[];
  }

  return [];
}

export default function TestSeriesPage() {
  const [, navigate] = useLocation();

  const [series, setSeries] = useState<TestSeries[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [deletingId, setDeletingId] = useState("");

  const [selectedSeries, setSelectedSeries] =
    useState<TestSeries | null>(null);

  const [error, setError] = useState("");

  async function loadFilters() {
    try {
      setLoadingFilters(true);

      const [coursesResponse, batchesResponse] =
        await Promise.all([
          apiRequest<any>("/api/courses"),
          apiRequest<any>("/api/batches"),
        ]);

      const courseList = extractArray<Course>(coursesResponse);
      const batchList = extractArray<Batch>(batchesResponse);

      setCourses(courseList);
      setBatches(batchList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFilters(false);
    }
  }

  async function loadSeries() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (selectedBatch) {
        params.set("batchId", selectedBatch);
      }

      const query = params.toString();

      const response = await apiRequest<ApiResponse | TestSeries[]>(
        `/api/test-series${query ? `?${query}` : ""}`,
      );

      const list = extractArray<TestSeries>(response)
        .map(normalizeSeries)
        .filter((item) => item.id);

      setSeries(list);

      if (
        selectedSeries &&
        !list.some((item) => item.id === selectedSeries.id)
      ) {
        setSelectedSeries(null);
      }
    } catch (err) {
      console.error(err);

      setSeries([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load test series.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFilters();
  }, []);

  useEffect(() => {
    void loadSeries();
  }, [selectedBatch]);

  const filteredBatches = useMemo(() => {
    if (!selectedCourse) return batches;

    return batches.filter((batch) => {
      const courseId =
        getId(batch.courseId) ||
        getId(batch.course);

      return courseId === selectedCourse;
    });
  }, [batches, selectedCourse]);

  const filteredSeries = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return series;

    return series.filter((item) => {
      const text = [
        item.title,
        item.batchName,
        item.type,
        item.status,
        ...(item.tests || []).map(
          (test) => test.subjectName || test.name,
        ),
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(term);
    });
  }, [series, search]);

  function handleCourseChange(value: string) {
    setSelectedCourse(value);
    setSelectedBatch("");
    setSelectedSeries(null);
  }

  async function handleDelete(item: TestSeries) {
    const confirmed = window.confirm(
      `Delete "${item.title}"?\n\nThis will remove the test series.`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      setError("");

      await apiRequest(`/api/test-series/${item.id}`, {
        method: "DELETE",
      });

      setSeries((current) =>
        current.filter((entry) => entry.id !== item.id),
      );

      if (selectedSeries?.id === item.id) {
        setSelectedSeries(null);
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete test series.",
      );
    } finally {
      setDeletingId("");
    }
  }

  const selectedTests = selectedSeries?.tests || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-blue-600">
                <ClipboardList className="h-4 w-4" />
                Tests & Results
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Test Series
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Create, view and manage your test series.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/tests")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Test
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <section className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Choose Class
              </h2>
              <p className="text-xs text-slate-500">
                Select a course and batch to see relevant tests.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadSeries()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Course
              </label>

              <select
                value={selectedCourse}
                onChange={(event) =>
                  handleCourseChange(event.target.value)
                }
                disabled={loadingFilters}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Courses</option>

                {courses.map((course) => {
                  const id = getId(course);

                  return (
                    <option key={id} value={id}>
                      {course.name || "Course"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Batch / Class
              </label>

              <select
                value={selectedBatch}
                onChange={(event) => {
                  setSelectedBatch(event.target.value);
                  setSelectedSeries(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Batches</option>

                {filteredBatches.map((batch) => {
                  const id = getId(batch);

                  return (
                    <option key={id} value={id}>
                      {batch.name || "Batch"}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Search
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search test series..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="font-semibold"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          {/* Series list */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Your Test Series
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredSeries.length} series found
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-2xl border bg-white">
                <div className="text-center">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-blue-600" />
                  <p className="mt-3 text-sm text-slate-500">
                    Loading test series...
                  </p>
                </div>
              </div>
            ) : filteredSeries.length === 0 ? (
              <div className="rounded-2xl border bg-white px-6 py-14 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                  <ClipboardList className="h-7 w-7 text-blue-600" />
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  No test series found
                </h3>

                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  Create your first test from the Tests page.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/tests")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create Test
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSeries.map((item) => {
                  const active =
                    selectedSeries?.id === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedSeries(item)}
                      className={`group w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                        active
                          ? "border-blue-400 ring-2 ring-blue-100"
                          : "border-slate-200 hover:border-blue-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <ClipboardList className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold text-slate-900">
                              {item.title}
                            </h3>

                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClasses(
                                item.status,
                              )}`}
                            >
                              {item.status || "scheduled"}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {item.batchName || "Batch"}
                            </span>

                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDate(
                                item.testDate,
                              )}
                            </span>

                            <span>
                              {typeLabel(item.type)}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                            <span>
                              {item.testCount || 0} test
                              {(item.testCount || 0) === 1
                                ? ""
                                : "s"}
                            </span>

                            <span>•</span>

                            <span>
                              {item.subjectCount || 0} subject
                              {(item.subjectCount || 0) === 1
                                ? ""
                                : "s"}
                            </span>
                          </div>
                        </div>

                        <ChevronRight
                          className={`mt-1 h-5 w-5 shrink-0 transition ${
                            active
                              ? "text-blue-600"
                              : "text-slate-300 group-hover:text-blue-500"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Details */}
          <section>
            <div className="sticky top-5">
              {!selectedSeries ? (
                <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <ClipboardList className="h-7 w-7 text-slate-500" />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">
                    Select a test series
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Click any test series to view its details and
                    subjects.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  <div className="border-b bg-slate-900 px-5 py-5 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-300">
                          Test Series
                        </p>

                        <h2 className="mt-1 text-xl font-bold">
                          {selectedSeries.title}
                        </h2>

                        <p className="mt-1 text-sm text-slate-300">
                          {selectedSeries.batchName}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses(
                          selectedSeries.status,
                        )}`}
                      >
                        {selectedSeries.status ||
                          "scheduled"}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Test Date
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatDate(
                            selectedSeries.testDate,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Type
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {typeLabel(
                            selectedSeries.type,
                          )}
                        </p>
                      </div>
                    </div>

                    {selectedSeries.instructions && (
                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
                        <p className="text-xs font-semibold text-blue-700">
                          Instructions
                        </p>

                        <p className="mt-1 whitespace-pre-wrap text-sm text-blue-900">
                          {selectedSeries.instructions}
                        </p>
                      </div>
                    )}

                    <div className="mt-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Tests
                          </h3>

                          <p className="text-xs text-slate-500">
                            Subjects included in this series
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {selectedTests.length}
                        </span>
                      </div>

                      {selectedTests.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-5 text-center">
                          <p className="text-sm text-slate-500">
                            No individual tests are available
                            in this series.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedTests.map(
                            (test, index) => {
                              const testId =
                                getId(test) ||
                                `${selectedSeries.id}-${index}`;

                              return (
                                <div
                                  key={testId}
                                  className="rounded-xl border p-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-900">
                                        {test.subjectName ||
                                          test.name ||
                                          test.title ||
                                          `Test ${index + 1}`}
                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">
                                        {test.name ||
                                          test.title ||
                                          "Test"}
                                      </p>
                                    </div>

                                    <div className="shrink-0 text-right">
                                      <p className="text-sm font-bold text-slate-900">
                                        {test.totalMarks || 0}
                                      </p>

                                      <p className="text-[10px] text-slate-500">
                                        Total Marks
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                    <span>
                                      Passing:{" "}
                                      {test.passingMarks ||
                                        0}
                                    </span>

                                    <span>
                                      {test.status ||
                                        selectedSeries.status ||
                                        "scheduled"}
                                    </span>
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-5 grid gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/tests?seriesId=${encodeURIComponent(
                              selectedSeries.id,
                            )}`,
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Open in Tests
                        <ChevronRight className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDelete(
                            selectedSeries,
                          )
                        }
                        disabled={
                          deletingId === selectedSeries.id
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId ===
                        selectedSeries.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete Test Series
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}