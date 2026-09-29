import {
  useListCourses,
  useListBatches,
  useListSubjects,
} from "@workspace/api-client-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Plus,
  CalendarDays,
  BookOpen,
  ClipboardPenLine,
  CheckCircle2,
  Users,
  Search,
  Pencil,
  ChevronDown,
  GraduationCap,
  FileText,
  Clock3,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

type TestSession = {
  id: string;
  _id?: string;
  title: string;
  type: string;
  batchId: string;
  batchName?: string;
  testDate: string;
  date?: string;
  status: string;
  paperCount?: number;
  instructions?: string;
};

type SubjectPaper = {
  id: string;
  _id?: string;
  seriesId?: string;
  testId?: string;
  name: string;
  subjectId: string;
  subjectName: string;
  date: string;
  totalMarks: number;
  passingMarks: number;
  maxMarks?: number;
  startTime?: string;
  endTime?: string;
  room?: string;
};

type MarkRow = {
  studentId: string;
  studentName: string;
  studentCode?: string;
  marksObtained: number | string | null;
  grade: string;
  resultStatus: string;
  remarks?: string;
};

type CreateTestForm = {
  title: string;
  type: string;
  testDate: string;
  instructions: string;
  selectedSubjects: string[];
  totalMarks: string;
  passingMarks: string;
};

const TEST_TYPES = [
  ["weekly-test", "Weekly Test"],
  ["monthly-test", "Monthly Test"],
  ["unit-test", "Unit Test"],
  ["half-yearly", "Half Yearly Test"],
  ["annual", "Annual Test"],
  ["practice-test", "Practice Test"],
  ["scholarship-test", "Scholarship Test"],
  ["mid-term", "Mid Term Test"],
  ["final", "Final Test"],
  ["mock", "Mock Test"],
];

const getHeaders = () => {
  const token = localStorage.getItem("coach_sutra_token") || "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function getError(response: Response) {
  try {
    const data = await response.json();

    return (
      data?.error ||
      data?.message ||
      "Something went wrong."
    );
  } catch {
    return "Something went wrong. Backend check karo.";
  }
}

function getId(item: any) {
  return String(item?.id ?? item?._id ?? "");
}

function formatDate(value: string) {
  if (!value) return "";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function typeLabel(type: string) {
  return type
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeSession(item: any): TestSession {
  const batchId = item?.batchId
    ? String(
        item.batchId?.id ??
          item.batchId?._id ??
          item.batchId,
      )
    : item?.batch
      ? getId(item.batch)
      : getId(item);

  return {
    id: getId(item),
    _id: item?._id,
    title: item?.title ?? item?.name ?? "Untitled Test",
    type: item?.type ?? "weekly-test",
    batchId,
    batchName:
      item?.batchName ??
      item?.batch?.name ??
      "",
    testDate:
      item?.testDate ??
      item?.date ??
      "",
    date:
      item?.date ??
      item?.testDate ??
      "",
    status: item?.status ?? "scheduled",
    paperCount:
      Number(item?.paperCount ?? item?.papers?.length ?? 0),
    instructions: item?.instructions ?? "",
  };
}

function normalizePaper(item: any): SubjectPaper {
  return {
    id: getId(item),
    _id: item?._id,
    seriesId: item?.seriesId
      ? String(
          item.seriesId?.id ??
            item.seriesId?._id ??
            item.seriesId,
        )
      : undefined,
    testId: item?.testId
      ? String(
          item.testId?.id ??
            item.testId?._id ??
            item.testId,
        )
      : undefined,
    name:
      item?.name ??
      item?.title ??
      "Test Paper",
    subjectId: String(
      item?.subjectId?.id ??
        item?.subjectId?._id ??
        item?.subjectId ??
        "",
    ),
    subjectName:
      item?.subjectName ??
      item?.subject?.name ??
      "Subject",
    date:
      item?.date ??
      item?.testDate ??
      "",
    totalMarks:
      Number(
        item?.totalMarks ??
          item?.maxMarks ??
          0,
      ),
    passingMarks:
      Number(item?.passingMarks ?? 0),
    maxMarks:
      Number(
        item?.maxMarks ??
          item?.totalMarks ??
          0,
      ),
    startTime: item?.startTime ?? "",
    endTime: item?.endTime ?? "",
    room: item?.room ?? "",
  };
}

function SearchableSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: {
    label: string;
    value: string;
    subLabel?: string;
  }[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const selected = options.find(
    (option) => option.value === value,
  );

  const filtered = options.filter((option) =>
    `${option.label} ${option.subLabel ?? ""}`
      .toLowerCase()
      .includes(term.toLowerCase()),
  );

  return (
    <div className="relative">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setTerm("");
          setOpen((old) => !old);
        }}
        className="flex h-11 w-full items-center justify-between rounded-lg border bg-background px-3 text-left text-sm transition hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="min-w-0">
          <span
            className={
              selected
                ? "font-medium"
                : "text-muted-foreground"
            }
          >
            {selected?.label ?? placeholder}
          </span>

          {selected?.subLabel ? (
            <span className="ml-2 text-xs text-muted-foreground">
              {selected.subLabel}
            </span>
          ) : null}
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-popover p-2 shadow-xl">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

            <Input
              autoFocus
              value={term}
              onChange={(event) =>
                setTerm(event.target.value)
              }
              placeholder={`Search ${label.toLowerCase()}...`}
              className="h-9 pl-9"
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            {filtered.length ? (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();

                    onChange(option.value);
                    setOpen(false);
                    setTerm("");
                  }}
                  className={`flex w-full flex-col rounded-md px-3 py-2.5 text-left text-sm transition hover:bg-muted ${
                    option.value === value
                      ? "bg-primary/5 text-primary"
                      : ""
                  }`}
                >
                  <span className="font-medium">
                    {option.label}
                  </span>

                  {option.subLabel ? (
                    <span className="text-xs text-muted-foreground">
                      {option.subLabel}
                    </span>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No matching option found
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = status.toLowerCase();

  if (normalized === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completed
      </span>
    );
  }

  if (normalized === "ongoing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Clock3 className="h-3.5 w-3.5" />
        Ongoing
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
      <CalendarDays className="h-3.5 w-3.5" />
      Scheduled
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>

      <h3 className="font-semibold">{title}</h3>

      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>

      {action ? (
        <div className="mt-4">{action}</div>
      ) : null}
    </div>
  );
}

export default function Tests() {
  const [location] = useLocation();

  const pageType =
    new URLSearchParams(
      location.split("?")[1] ??
        window.location.search,
    ).get("type") === "computer"
      ? "computer"
      : "academic";

  const { data: courses } =
    useListCourses();

  const { data: batches } =
    useListBatches();

  const { data: subjects } =
    useListSubjects();

  const [courseId, setCourseId] =
    useState("");

  const [batchId, setBatchId] =
    useState("");

  const [sessions, setSessions] =
    useState<TestSession[]>([]);

  const [selectedSession, setSelectedSession] =
    useState<TestSession | null>(null);

  const [papers, setPapers] =
    useState<SubjectPaper[]>([]);

  const [loadingSessions, setLoadingSessions] =
    useState(false);

  const [loadingPapers, setLoadingPapers] =
    useState(false);

  const [createOpen, setCreateOpen] =
    useState(false);

  const [editOpen, setEditOpen] =
    useState(false);

  const [editingSession, setEditingSession] =
    useState<TestSession | null>(null);

  const [editForm, setEditForm] =
    useState({
      title: "",
      type: "weekly-test",
      testDate: "",
      instructions: "",
      status: "scheduled",
    });

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [marksOpen, setMarksOpen] =
    useState(false);

  const [selectedPaper, setSelectedPaper] =
    useState<SubjectPaper | null>(null);

  const [marks, setMarks] =
    useState<MarkRow[]>([]);

  const [loadingMarks, setLoadingMarks] =
    useState(false);

  const [savingMarks, setSavingMarks] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<"error" | "success">("error");

  const [savingTest, setSavingTest] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [marksSearch, setMarksSearch] =
    useState("");

  const newTest = (): CreateTestForm => ({
    title: "",
    type: "weekly-test",
    testDate: new Date()
      .toISOString()
      .slice(0, 10),
    instructions: "",
    selectedSubjects: [],
    totalMarks: "25",
    passingMarks: "10",
  });

  const [testForm, setTestForm] =
    useState<CreateTestForm>(newTest());

  const courseList = useMemo(
    () =>
      ((courses ?? []) as any[]).filter(
        (course) =>
          (course.courseType ?? "academic") ===
          pageType,
      ),
    [courses, pageType],
  );

  const allowedCourseIds = useMemo(
    () =>
      new Set(
        courseList.map((course) =>
          getId(course),
        ),
      ),
    [courseList],
  );

  const batchList = useMemo(
    () =>
      ((batches ?? []) as any[]).filter(
        (batch) =>
          allowedCourseIds.has(
            String(
              batch.courseId?.id ??
                batch.courseId?._id ??
                batch.courseId ??
                "",
            ),
          ),
      ),
    [batches, allowedCourseIds],
  );

  const filteredBatches = batchList.filter(
    (batch) =>
      !courseId ||
      String(
        batch.courseId?.id ??
          batch.courseId?._id ??
          batch.courseId ??
          "",
      ) === String(courseId),
  );

  const selectedBatch = batchList.find(
    (batch) => getId(batch) === batchId,
  );

  const selectedCourse = courseList.find(
    (course) => getId(course) === courseId,
  );

  const availableSubjects = useMemo(
    () =>
      ((subjects ?? []) as any[]).filter(
        (subject) =>
          selectedBatch &&
          String(
            subject.courseId?.id ??
              subject.courseId?._id ??
              subject.courseId ??
              "",
          ) ===
            String(
              selectedBatch.courseId?.id ??
                selectedBatch.courseId?._id ??
                selectedBatch.courseId ??
                "",
            ),
      ),
    [subjects, selectedBatch],
  );

  const visibleSessions = sessions.filter(
    (session) =>
      `${session.title} ${session.type} ${session.testDate}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const visibleMarks = marks.filter(
    (row) =>
      `${row.studentName} ${row.studentCode ?? ""}`
        .toLowerCase()
        .includes(marksSearch.toLowerCase()),
  );

  const completedMarks = marks.filter(
    (row) =>
      row.marksObtained !== null &&
      row.marksObtained !== "",
  ).length;

  const loadSessions = async (
    currentBatchId = batchId,
  ) => {
    if (!currentBatchId) {
      setSessions([]);
      setSelectedSession(null);
      setPapers([]);
      return;
    }

    setLoadingSessions(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/test-series?batchId=${encodeURIComponent(
          currentBatchId,
        )}`,
        {
          headers: getHeaders(),
        },
      );

      if (!response.ok) {
        setMessageType("error");
        setMessage(await getError(response));
        return;
      }

      const data = await response.json();

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.testSeries)
          ? data.testSeries
          : Array.isArray(data?.series)
            ? data.series
            : Array.isArray(data?.data)
              ? data.data
              : [];

      setSessions(
        rows.map(normalizeSession),
      );
    } catch {
      setMessageType("error");
      setMessage(
        "Tests load nahi hue. Backend check karo.",
      );
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadPapers = async (
    session: TestSession,
  ) => {
    setSelectedSession(session);
    setLoadingPapers(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/tests?seriesId=${encodeURIComponent(
          session.id,
        )}`,
        {
          headers: getHeaders(),
        },
      );

      if (!response.ok) {
        setMessageType("error");
        setMessage(await getError(response));
        return;
      }

      const data = await response.json();

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.tests)
          ? data.tests
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setPapers(
        rows.map(normalizePaper),
      );
    } catch {
      setMessageType("error");
      setMessage(
        "Subject papers load nahi hue.",
      );
    } finally {
      setLoadingPapers(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  const toggleSubject = (
    subjectId: string,
  ) => {
    setTestForm((old) => ({
      ...old,
      selectedSubjects:
        old.selectedSubjects.includes(subjectId)
          ? old.selectedSubjects.filter(
              (id) => id !== subjectId,
            )
          : [
              ...old.selectedSubjects,
              subjectId,
            ],
    }));
  };

  const createTest = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setMessage("");
    setMessageType("error");

    if (!batchId) {
      setMessage(
        "Pehle Batch select karo.",
      );
      return;
    }

    if (!testForm.title.trim()) {
      setMessage("Test name likho.");
      return;
    }

    if (!testForm.testDate) {
      setMessage("Test Date select karo.");
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        testForm.testDate,
      )
    ) {
      setMessage(
        "Test Date valid format me honi chahiye.",
      );
      return;
    }

    if (!testForm.selectedSubjects.length) {
      setMessage(
        "Kam se kam ek Subject select karo.",
      );
      return;
    }

    const totalMarks = Number(
      testForm.totalMarks,
    );

    const passingMarks = Number(
      testForm.passingMarks,
    );

    if (
      !Number.isFinite(totalMarks) ||
      totalMarks <= 0 ||
      !Number.isFinite(passingMarks) ||
      passingMarks < 0 ||
      passingMarks > totalMarks
    ) {
      setMessage(
        "Total Marks aur Passing Marks check karo.",
      );
      return;
    }

    setSavingTest(true);

    try {
      const firstSubject =
        testForm.selectedSubjects[0];

      const response = await fetch(
        "/api/tests",
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            title: testForm.title.trim(),
            name: testForm.title.trim(),
            type: testForm.type,
            batchId,
            date: testForm.testDate,
            testDate: testForm.testDate,
            maxMarks: totalMarks,
            totalMarks,
            passingMarks,
            instructions:
              testForm.instructions.trim(),
            subjectId: firstSubject,
          }),
        },
      );

      if (!response.ok) {
        setMessage(await getError(response));
        return;
      }

      const created =
        await response.json();

      let additionalError = "";

      for (
        let index = 1;
        index < testForm.selectedSubjects.length;
        index++
      ) {
        const subjectId =
          testForm.selectedSubjects[index];

        const additionalResponse =
          await fetch("/api/tests", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              title:
                testForm.title.trim(),
              name:
                testForm.title.trim(),
              type: testForm.type,
              batchId,
              date: testForm.testDate,
              testDate: testForm.testDate,
              maxMarks: totalMarks,
              totalMarks,
              passingMarks,
              instructions:
                testForm.instructions.trim(),
              subjectId,
            }),
          });

        if (!additionalResponse.ok) {
          const subject =
            availableSubjects.find(
              (item) =>
                getId(item) === subjectId,
            );

          additionalError =
            `${
              subject?.name ?? "Subject"
            } add nahi hua: ${await getError(
              additionalResponse,
            )}`;

          break;
        }
      }

      setCreateOpen(false);
      setTestForm(newTest());

      if (additionalError) {
        setMessageType("error");
        setMessage(
          `Test create ho gaya, lekin ${additionalError}`,
        );
      } else {
        setMessageType("success");
        setMessage(
          "Test successfully create ho gaya.",
        );
      }

      await loadSessions(batchId);

      const createdTest =
        created?.test ??
        created?.data ??
        created;

      const seriesId =
        createdTest?.seriesId
          ? String(
              createdTest.seriesId?.id ??
                createdTest.seriesId?._id ??
                createdTest.seriesId,
            )
          : createdTest?.series?.id ??
            createdTest?.series?._id ??
            "";

      if (seriesId) {
        const session: TestSession =
          normalizeSession(
            createdTest?.series ?? {
              ...createdTest,
              id: seriesId,
              _id: seriesId,
            },
          );

        await loadPapers(session);
      }
    } catch {
      setMessageType("error");
      setMessage(
        "Test create nahi hua. Backend check karo.",
      );
    } finally {
      setSavingTest(false);
    }
  };

  const openEditSession = (
    session: TestSession,
  ) => {
    setMessage("");
    setEditingSession(session);

    setEditForm({
      title: session.title ?? "",
      type:
        session.type ??
        "weekly-test",
      testDate: String(
        session.testDate ?? "",
      ).slice(0, 10),
      instructions:
        session.instructions ?? "",
      status:
        session.status ??
        "scheduled",
    });

    setEditOpen(true);
  };

  const saveSessionUpdate = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (!editingSession) return;

    if (
      !editForm.title.trim() ||
      !editForm.testDate
    ) {
      setMessage(
        "Test Name aur Test Date required hai.",
      );
      return;
    }

    setSavingEdit(true);
    setMessage("");
    setMessageType("error");

    try {
      const response = await fetch(
        `/api/test-series/${editingSession.id}`,
        {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            title:
              editForm.title.trim(),
            type: editForm.type,
            testDate:
              editForm.testDate,
            status:
              editForm.status,
            instructions:
              editForm.instructions.trim(),
          }),
        },
      );

      if (!response.ok) {
        setMessage(await getError(response));
        return;
      }

      const updated =
        await response.json();

      setEditOpen(false);
      setEditingSession(null);

      setMessageType("success");
      setMessage(
        "Test successfully update ho gaya.",
      );

      await loadSessions(batchId);

      const updatedId = String(
        updated?.id ??
          updated?._id ??
          updated?.data?.id ??
          updated?.data?._id ??
          "",
      );

      if (
        selectedSession?.id &&
        selectedSession.id === updatedId
      ) {
        await loadPapers({
          ...selectedSession,
          ...normalizeSession(
            updated?.data ?? updated,
          ),
        });
      }
    } catch {
      setMessageType("error");
      setMessage(
        "Test update nahi hua. Backend check karo.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const openMarks = async (
    paper: SubjectPaper,
  ) => {
    setSelectedPaper(paper);
    setMarksOpen(true);
    setLoadingMarks(true);
    setMarksSearch("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/tests/${paper.id}/marks`,
        {
          headers: getHeaders(),
        },
      );

      if (!response.ok) {
        setMessageType("error");
        setMessage(await getError(response));
        setMarks([]);
        return;
      }

      const data =
        await response.json();

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.marks)
          ? data.marks
          : Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data?.data)
              ? data.data
              : [];

      setMarks(
        rows.map((row: any) => ({
          studentId: String(
            row.studentId?.id ??
              row.studentId?._id ??
              row.studentId ??
              "",
          ),
          studentName:
            row.studentName ??
            row.student?.name ??
            `${row.student?.firstName ?? ""} ${
              row.student?.lastName ?? ""
            }`.trim(),
          studentCode:
            row.studentCode ??
            row.student?.studentCode ??
            row.student?.admissionNumber ??
            "",
          marksObtained:
            row.marksObtained ??
            null,
          grade:
            row.grade ?? "",
          resultStatus:
            row.resultStatus ??
            row.status ??
            "pending",
          remarks:
            row.remarks ?? "",
        })),
      );
    } catch {
      setMessageType("error");
      setMessage(
        "Students ke marks load nahi hue.",
      );
      setMarks([]);
    } finally {
      setLoadingMarks(false);
    }
  };

  const updateMark = (
    studentId: string,
    value: string,
  ) => {
    setMarks((old) =>
      old.map((row) =>
        row.studentId === studentId
          ? {
              ...row,
              marksObtained: value,
            }
          : row,
      ),
    );
  };

  const saveMark = async (
    row: MarkRow,
  ) => {
    if (!selectedPaper) return;

    const marksObtained = Number(
      row.marksObtained,
    );

    if (
      !Number.isFinite(
        marksObtained,
      ) ||
      marksObtained < 0 ||
      marksObtained >
        selectedPaper.totalMarks
    ) {
      setMessageType("error");
      setMessage(
        `Marks 0 se ${selectedPaper.totalMarks} ke beech honi chahiye.`,
      );
      return;
    }

    setSavingMarks(row.studentId);

    try {
      const response = await fetch(
        `/api/tests/${selectedPaper.id}/marks`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            studentId:
              row.studentId,
            marksObtained,
            remarks:
              row.remarks ?? "",
          }),
        },
      );

      if (!response.ok) {
        setMessageType("error");
        setMessage(await getError(response));
        return;
      }

      const saved =
        await response.json();

      const savedMark =
        saved?.mark ??
        saved?.data ??
        saved;

      setMarks((old) =>
        old.map((item) =>
          item.studentId ===
          row.studentId
            ? {
                ...item,
                ...savedMark,
              }
            : item,
        ),
      );

      setMessageType("success");
      setMessage(
        `${row.studentName} ke marks save ho gaye.`,
      );
    } catch {
      setMessageType("error");
      setMessage(
        "Marks save nahi hue.",
      );
    } finally {
      setSavingMarks(null);
    }
  };

  const pageLabel =
    pageType === "computer"
      ? "Computer Tests"
      : "Academic Tests";

  return (
    <div className="space-y-5 pb-8">

      {/* ================================================= */}
      {/* PAGE HEADER */}
      {/* ================================================= */}

      <div className="flex flex-col gap-4 rounded-2xl border bg-background p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardPenLine className="h-6 w-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {pageLabel}
              </h1>

              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                Test Management
              </span>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Tests create karo, subjects manage karo aur
              students ke marks enter karo.
            </p>
          </div>
        </div>

        <Button
          size="lg"
          onClick={() => {
            setMessage("");
            setTestForm(newTest());
            setCreateOpen(true);
          }}
          disabled={!batchId}
        >
          <Plus className="mr-2 h-5 w-5" />
          Create Test
        </Button>
      </div>

      {/* ================================================= */}
      {/* COURSE + BATCH */}
      {/* ================================================= */}

      <Card className="overflow-visible">
        <CardContent className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" />
            </div>

            <div>
              <h2 className="font-semibold">
                Select Class
              </h2>

              <p className="text-xs text-muted-foreground">
                Course aur Batch select karke tests dekho.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SearchableSelect
              label="Course"
              value={courseId}
              placeholder="Select Course"
              options={courseList.map(
                (course) => ({
                  label: course.name,
                  value: getId(course),
                  subLabel:
                    pageType === "computer"
                      ? "Computer Course"
                      : "Academic Course",
                }),
              )}
              onChange={(value) => {
                setCourseId(value);
                setBatchId("");
                setSelectedSession(null);
                setPapers([]);
                setSessions([]);
              }}
            />

            <SearchableSelect
              label="Batch"
              value={batchId}
              placeholder={
                courseId
                  ? "Select Batch"
                  : "First select Course"
              }
              disabled={!courseId}
              options={filteredBatches.map(
                (batch) => ({
                  label: batch.name,
                  value: getId(batch),
                  subLabel:
                    selectedCourse?.name ??
                    "Batch",
                }),
              )}
              onChange={(value) => {
                setBatchId(value);
                setSelectedSession(null);
                setPapers([]);
                setSearchTerm("");
              }}
            />
          </div>

          {selectedBatch ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />

              <span className="font-medium">
                {selectedCourse?.name}
              </span>

              <span className="text-muted-foreground">
                /
              </span>

              <span className="text-muted-foreground">
                {selectedBatch.name}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ================================================= */}
      {/* MESSAGE */}
      {/* ================================================= */}

      {message ? (
        <div
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
            messageType === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {messageType === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : null}

          <span>{message}</span>
        </div>
      ) : null}

      {/* ================================================= */}
      {/* TEST LIST */}
      {/* ================================================= */}

      <Card>
        <CardHeader className="border-b px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">
                Tests
              </CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                {batchId
                  ? `${selectedBatch?.name ?? "Selected batch"} ke tests`
                  : "Course aur Batch select karo"}
              </p>
            </div>

            {batchId ? (
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

                <Input
                  className="h-10 pl-9"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value,
                    )
                  }
                  placeholder="Search test..."
                />
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {!batchId ? (
            <EmptyState
              icon={GraduationCap}
              title="Select a Batch"
              description="Course aur Batch select karne ke baad us batch ke tests yahan dikhai denge."
            />
          ) : loadingSessions ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Tests load ho rahe hain...
            </div>
          ) : visibleSessions.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleSessions.map(
                (session) => {
                  const isSelected =
                    selectedSession?.id ===
                    session.id;

                  return (
                    <div
                      key={session.id}
                      className={`group rounded-xl border p-4 transition ${
                        isSelected
                          ? "border-primary bg-primary/[0.04] shadow-sm"
                          : "hover:border-primary/40 hover:shadow-sm"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          loadPapers(
                            session,
                          )
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FileText className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate font-semibold">
                                {session.title}
                              </h3>

                              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDate(
                                  session.testDate,
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                          ) : (
                            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            {typeLabel(
                              session.type,
                            )}
                          </span>

                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                            {session.paperCount ?? 0}{" "}
                            Subject
                            {(session.paperCount ?? 0) ===
                            1
                              ? ""
                              : "s"}
                          </span>
                        </div>
                      </button>

                      <div className="mt-4 flex items-center justify-between border-t pt-3">
                        <StatusBadge
                          status={
                            session.status
                          }
                        />

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            openEditSession(
                              session,
                            )
                          }
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No Tests Found"
              description="Is batch ke liye abhi koi test available nahi hai."
              action={
                <Button
                  onClick={() => {
                    setMessage("");
                    setTestForm(newTest());
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Test
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* ================================================= */}
      {/* SELECTED TEST */}
      {/* ================================================= */}

      {selectedSession ? (
        <Card>
          <CardHeader className="border-b px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">
                    {selectedSession.title}
                  </CardTitle>

                  <StatusBadge
                    status={
                      selectedSession.status
                    }
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(
                      selectedSession.testDate,
                    )}
                  </span>

                  <span>
                    {typeLabel(
                      selectedSession.type,
                    )}
                  </span>

                  <span>
                    {selectedBatch?.name ??
                      selectedSession.batchName ??
                      "Batch"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5">
                <BookOpen className="h-4 w-4 text-muted-foreground" />

                <span className="font-semibold">
                  {papers.length}
                </span>

                <span className="text-sm text-muted-foreground">
                  Subjects
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {loadingPapers ? (
              <div className="flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Subjects load ho rahe hain...
              </div>
            ) : papers.length ? (
              <div>
                <div className="mb-4">
                  <h3 className="font-semibold">
                    Test Subjects
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Subject ke saamne marks enter karne ke
                    liye button click karo.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {papers.map(
                    (paper) => (
                      <div
                        key={paper.id}
                        className="rounded-xl border p-4 transition hover:border-primary/40 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BookOpen className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <h4 className="truncate font-semibold">
                              {
                                paper.subjectName
                              }
                            </h4>

                            <p className="truncate text-xs text-muted-foreground">
                              {paper.name}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 rounded-lg border">
                          <div className="p-3 text-center">
                            <div className="text-xs text-muted-foreground">
                              Total Marks
                            </div>

                            <div className="mt-1 text-lg font-bold">
                              {
                                paper.totalMarks
                              }
                            </div>
                          </div>

                          <div className="border-l p-3 text-center">
                            <div className="text-xs text-muted-foreground">
                              Passing
                            </div>

                            <div className="mt-1 text-lg font-bold">
                              {
                                paper.passingMarks
                              }
                            </div>
                          </div>
                        </div>

                        <Button
                          className="mt-4 w-full"
                          onClick={() =>
                            openMarks(
                              paper,
                            )
                          }
                        >
                          <ClipboardPenLine className="mr-2 h-4 w-4" />
                          Enter Marks
                        </Button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No Subjects Found"
                description="Is test ke andar koi subject paper available nahi hai."
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* ================================================= */}
      {/* CREATE TEST */}
      {/* ================================================= */}

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      >
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Create New Test
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={createTest}
            className="space-y-5"
          >
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  1
                </div>

                <div>
                  <div className="font-semibold">
                    Test Details
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Test ka naam, type aur date.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">
                  Test Name *
                </label>

                <Input
                  className="mt-1.5"
                  value={testForm.title}
                  onChange={(event) =>
                    setTestForm(
                      (old) => ({
                        ...old,
                        title:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="Example: Weekly Test 1"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Test Type *
                </label>

                <select
                  className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={testForm.type}
                  onChange={(event) =>
                    setTestForm(
                      (old) => ({
                        ...old,
                        type:
                          event.target.value,
                      }),
                    )
                  }
                >
                  {TEST_TYPES.map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">
                Test Date *
              </label>

              <Input
                className="mt-1.5"
                type="date"
                value={
                  testForm.testDate
                }
                onChange={(event) =>
                  setTestForm(
                    (old) => ({
                      ...old,
                      testDate:
                        event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  2
                </div>

                <div>
                  <div className="font-semibold">
                    Marks & Subjects
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Marks aur test ke subjects select karo.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">
                  Total Marks *
                </label>

                <Input
                  className="mt-1.5"
                  type="number"
                  min="1"
                  value={
                    testForm.totalMarks
                  }
                  onChange={(event) =>
                    setTestForm(
                      (old) => ({
                        ...old,
                        totalMarks:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Passing Marks *
                </label>

                <Input
                  className="mt-1.5"
                  type="number"
                  min="0"
                  value={
                    testForm.passingMarks
                  }
                  onChange={(event) =>
                    setTestForm(
                      (old) => ({
                        ...old,
                        passingMarks:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold">
                  Select Subjects *
                </label>

                <span className="text-xs text-muted-foreground">
                  {testForm.selectedSubjects.length}{" "}
                  selected
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {availableSubjects.map(
                  (subject) => {
                    const id =
                      getId(subject);

                    const checked =
                      testForm.selectedSubjects.includes(
                        id,
                      );

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          toggleSubject(
                            id,
                          )
                        }
                        className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition ${
                          checked
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />

                          <span className="font-medium">
                            {
                              subject.name
                            }
                          </span>
                        </div>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                            checked
                              ? "border-primary bg-primary text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {checked
                            ? "✓"
                            : ""}
                        </span>
                      </button>
                    );
                  },
                )}

                {!availableSubjects.length ? (
                  <div className="col-span-full rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                    Is course me Subject available nahi
                    hai. Pehle Subjects section me subjects
                    add karo.
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">
                Instructions{" "}
                <span className="font-normal text-muted-foreground">
                  (Optional)
                </span>
              </label>

              <Textarea
                className="mt-1.5"
                rows={3}
                value={
                  testForm.instructions
                }
                onChange={(event) =>
                  setTestForm(
                    (old) => ({
                      ...old,
                      instructions:
                        event.target.value,
                    }),
                  )
                }
                placeholder="Students ke liye instructions..."
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCreateOpen(false)
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={savingTest}
              >
                {savingTest
                  ? "Creating..."
                  : "Create Test"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================= */}
      {/* EDIT TEST */}
      {/* ================================================= */}

      <Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Edit Test
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={saveSessionUpdate}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-semibold">
                Test Name
              </label>

              <Input
                className="mt-1.5"
                value={editForm.title}
                onChange={(event) =>
                  setEditForm(
                    (old) => ({
                      ...old,
                      title:
                        event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">
                  Test Type
                </label>

                <select
                  className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={editForm.type}
                  onChange={(event) =>
                    setEditForm(
                      (old) => ({
                        ...old,
                        type:
                          event.target.value,
                      }),
                    )
                  }
                >
                  {TEST_TYPES.map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Test Date
                </label>

                <Input
                  className="mt-1.5"
                  type="date"
                  value={
                    editForm.testDate
                  }
                  onChange={(event) =>
                    setEditForm(
                      (old) => ({
                        ...old,
                        testDate:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">
                Status
              </label>

              <select
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={
                  editForm.status
                }
                onChange={(event) =>
                  setEditForm(
                    (old) => ({
                      ...old,
                      status:
                        event.target.value,
                    }),
                  )
                }
              >
                <option value="scheduled">
                  Scheduled
                </option>

                <option value="ongoing">
                  Ongoing
                </option>

                <option value="completed">
                  Completed
                </option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">
                Instructions
              </label>

              <Textarea
                className="mt-1.5"
                rows={3}
                value={
                  editForm.instructions
                }
                onChange={(event) =>
                  setEditForm(
                    (old) => ({
                      ...old,
                      instructions:
                        event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div className="flex gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() =>
                  setEditOpen(false)
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="flex-1"
                disabled={savingEdit}
              >
                {savingEdit
                  ? "Updating..."
                  : "Update Test"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================= */}
      {/* MARKS */}
      {/* ================================================= */}

      <Dialog
        open={marksOpen}
        onOpenChange={setMarksOpen}
      >
        <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Enter Student Marks
            </DialogTitle>
          </DialogHeader>

          {selectedPaper ? (
            <div className="space-y-4">

              {/* Marks summary */}

              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="h-4 w-4" />
                      </div>

                      <div>
                        <div className="font-bold">
                          {
                            selectedPaper.subjectName
                          }
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {selectedSession?.title}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="rounded-lg bg-background px-4 py-2 text-center">
                      <div className="text-xs text-muted-foreground">
                        Total
                      </div>

                      <div className="font-bold">
                        {
                          selectedPaper.totalMarks
                        }
                      </div>
                    </div>

                    <div className="rounded-lg bg-background px-4 py-2 text-center">
                      <div className="text-xs text-muted-foreground">
                        Passing
                      </div>

                      <div className="font-bold">
                        {
                          selectedPaper.passingMarks
                        }
                      </div>
                    </div>

                    <div className="rounded-lg bg-green-50 px-4 py-2 text-center">
                      <div className="text-xs text-green-700">
                        Entered
                      </div>

                      <div className="font-bold text-green-700">
                        {completedMarks}/
                        {marks.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student search */}

              {!loadingMarks ? (
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

                  <Input
                    className="pl-9"
                    value={marksSearch}
                    onChange={(event) =>
                      setMarksSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search student..."
                  />
                </div>
              ) : null}

              {loadingMarks ? (
                <div className="flex min-h-[250px] items-center justify-center text-sm text-muted-foreground">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Students load ho rahe hain...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="p-3 text-left font-semibold">
                          Student
                        </th>

                        <th className="w-32 p-3 text-center font-semibold">
                          Marks
                        </th>

                        <th className="w-24 p-3 text-center font-semibold">
                          Grade
                        </th>

                        <th className="w-28 p-3 text-center font-semibold">
                          Result
                        </th>

                        <th className="w-28 p-3 text-right font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleMarks.map(
                        (row) => (
                          <tr
                            key={
                              row.studentId
                            }
                            className="border-t hover:bg-muted/20"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <Users className="h-4 w-4" />
                                </div>

                                <div>
                                  <div className="font-semibold">
                                    {
                                      row.studentName
                                    }
                                  </div>

                                  {row.studentCode ? (
                                    <div className="text-xs text-muted-foreground">
                                      {
                                        row.studentCode
                                      }
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </td>

                            <td className="p-3 text-center">
                              <Input
                                className="mx-auto h-9 w-24 text-center font-semibold"
                                type="number"
                                min="0"
                                max={
                                  selectedPaper.totalMarks
                                }
                                value={
                                  row.marksObtained ??
                                  ""
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateMark(
                                    row.studentId,
                                    event.target.value,
                                  )
                                }
                                placeholder={`0-${selectedPaper.totalMarks}`}
                              />
                            </td>

                            <td className="p-3 text-center">
                              <span className="font-bold">
                                {row.grade ||
                                  "-"}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  row.resultStatus ===
                                  "pass"
                                    ? "bg-green-100 text-green-700"
                                    : row.resultStatus ===
                                        "fail"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {row.resultStatus ===
                                "pass"
                                  ? "PASS"
                                  : row.resultStatus ===
                                      "fail"
                                    ? "FAIL"
                                    : "PENDING"}
                              </span>
                            </td>

                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                onClick={() =>
                                  saveMark(
                                    row,
                                  )
                                }
                                disabled={
                                  savingMarks ===
                                  row.studentId
                                }
                              >
                                {savingMarks ===
                                row.studentId
                                  ? "Saving..."
                                  : "Save"}
                              </Button>
                            </td>
                          </tr>
                        ),
                      )}

                      {!visibleMarks.length ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-10 text-center text-muted-foreground"
                          >
                            {marks.length
                              ? "Search ke according koi student nahi mila."
                              : "No students found in this batch."}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}