import { useListCourses, useListBatches, useListSubjects } from "@workspace/api-client-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  CalendarDays,
  BookOpen,
  ClipboardPenLine,
  CheckCircle2,
  Clock3,
  Users,
  X,
  ChevronRight,
  Search,
  Pencil,
} from "lucide-react";

type TestSession = {
  id: string;
  title: string;
  type: string;
  batchId: string;
  batchName: string;
  testDate: string;
  status: string;
  paperCount: number;
  instructions?: string;
};

type SubjectPaper = {
  id: string;
  seriesId: string;
  name: string;
  subjectId: string;
  subjectName: string;
  date: string;
  totalMarks: number;
  passingMarks: number;
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
  ["half-yearly", "Half Yearly Exam"],
  ["annual", "Annual Exam"],
  ["practice-test", "Practice Test"],
  ["scholarship-test", "Scholarship Test"],
  ["mid-term", "Mid Term"],
  ["final", "Final Exam"],
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
    return data?.error || data?.message || "Something went wrong.";
  } catch {
    return "Something went wrong. Backend check karo.";
  }
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
  return type.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  options: { label: string; value: string; subLabel?: string }[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    `${option.label} ${option.subLabel ?? ""}`.toLowerCase().includes(term.toLowerCase())
  );

  return (
    <div className="relative">
      <label className="text-sm font-medium">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setTerm("");
          setOpen((old) => !old);
        }}
        className="mt-1 flex h-11 w-full items-center justify-between rounded-md border bg-background px-3 text-left text-sm hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selected ? "" : "text-muted-foreground"}>
          {selected?.label ?? placeholder}
        </span>
        <span className="text-xs text-muted-foreground">▼</span>
      </button>

      {open && !disabled ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-lg">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
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
                  className="flex w-full flex-col rounded px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="font-medium">{option.label}</span>
                  {option.subLabel ? (
                    <span className="text-xs text-muted-foreground">{option.subLabel}</span>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-center text-sm text-muted-foreground">
                No matching option found
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Exams() {
  const [location] = useLocation();
  const pageType =
    new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type") === "computer"
      ? "computer"
      : "academic";

  const { data: courses } = useListCourses();
  const { data: batches } = useListBatches();
  const { data: subjects } = useListSubjects();

  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TestSession | null>(null);
  const [papers, setPapers] = useState<SubjectPaper[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TestSession | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    type: "weekly-test",
    testDate: "",
    instructions: "",
    status: "scheduled",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [marksOpen, setMarksOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<SubjectPaper | null>(null);
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [savingMarks, setSavingMarks] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [savingTest, setSavingTest] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const newTest = (): CreateTestForm => ({
    title: "",
    type: "weekly-test",
    testDate: new Date().toISOString().slice(0, 10),
    instructions: "",
    selectedSubjects: [],
    totalMarks: "25",
    passingMarks: "10",
  });

  const [testForm, setTestForm] = useState<CreateTestForm>(newTest());

  const courseList = useMemo(
    () =>
      ((courses ?? []) as any[]).filter(
        (course) => (course.courseType ?? "academic") === pageType
      ),
    [courses, pageType]
  );

  const allowedCourseIds = useMemo(
    () => new Set(courseList.map((course) => String(course.id))),
    [courseList]
  );

  const batchList = useMemo(
    () =>
      ((batches ?? []) as any[]).filter((batch) =>
        allowedCourseIds.has(String(batch.courseId ?? ""))
      ),
    [batches, allowedCourseIds]
  );

  const filteredBatches = batchList.filter(
    (batch) => !courseId || String(batch.courseId ?? "") === String(courseId)
  );

  const selectedBatch = batchList.find((batch) => batch.id === batchId);
  const selectedCourse = courseList.find((course) => course.id === courseId);

  const availableSubjects = useMemo(
    () =>
      ((subjects ?? []) as any[]).filter(
        (subject) =>
          selectedBatch &&
          String(subject.courseId ?? "") === String(selectedBatch.courseId ?? "")
      ),
    [subjects, selectedBatch]
  );

  const visibleSessions = sessions.filter((session) =>
    `${session.title} ${session.type} ${session.testDate}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const loadSessions = async (currentBatchId = batchId) => {
    if (!currentBatchId) {
      setSessions([]);
      setSelectedSession(null);
      setPapers([]);
      return;
    }

    setLoadingSessions(true);
    setMessage("");

    try {
      const response = await fetch(`/api/exam-series?batchId=${currentBatchId}`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        setMessage(await getError(response));
        return;
      }

      setSessions(await response.json());
    } catch {
      setMessage("Tests load nahi hue. Backend run hai ya nahi check karo.");
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadPapers = async (session: TestSession) => {
    setSelectedSession(session);
    setLoadingPapers(true);
    setMessage("");

    try {
      const response = await fetch(`/api/exams?seriesId=${session.id}`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        setMessage(await getError(response));
        return;
      }

      setPapers(await response.json());
    } catch {
      setMessage("Subject papers load nahi hue.");
    } finally {
      setLoadingPapers(false);
    }
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  const toggleSubject = (subjectId: string) => {
    setTestForm((old) => ({
      ...old,
      selectedSubjects: old.selectedSubjects.includes(subjectId)
        ? old.selectedSubjects.filter((id) => id !== subjectId)
        : [...old.selectedSubjects, subjectId],
    }));
  };

  const createTest = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!batchId) {
      setMessage("Pehle Course aur Batch select karo.");
      return;
    }

    if (!testForm.title.trim()) {
      setMessage("Test / Exam name likho.");
      return;
    }

    if (!testForm.selectedSubjects.length) {
      setMessage("Kam se kam ek Subject select karo.");
      return;
    }

    const totalMarks = Number(testForm.totalMarks);
    const passingMarks = Number(testForm.passingMarks);

    if (!Number.isFinite(totalMarks) || totalMarks <= 0 || !Number.isFinite(passingMarks) || passingMarks < 0 || passingMarks > totalMarks) {
      setMessage("Total Marks aur Passing Marks check karo.");
      return;
    }

    setSavingTest(true);

    try {
      const seriesResponse = await fetch("/api/exam-series", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: testForm.title.trim(),
          type: testForm.type,
          batchId,
          testDate: testForm.testDate,
          instructions: testForm.instructions.trim(),
        }),
      });

      if (!seriesResponse.ok) {
        setMessage(await getError(seriesResponse));
        return;
      }

      const createdSession = await seriesResponse.json();

      for (const subjectId of testForm.selectedSubjects) {
        const subject = availableSubjects.find((item) => item.id === subjectId);

        const paperResponse = await fetch("/api/exams", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            seriesId: createdSession.id,
            subjectId,
            name: `${subject?.name || "Subject"} Paper`,
            date: testForm.testDate,
            totalMarks,
            passingMarks,
            instructions: testForm.instructions.trim(),
          }),
        });

        if (!paperResponse.ok) {
          setMessage(
            `Test create ho gaya, lekin ${subject?.name || "ek subject"} add nahi hua: ${await getError(paperResponse)}`
          );
        }
      }

      setCreateOpen(false);
      setTestForm(newTest());
      await loadSessions(batchId);

      const fullSession = {
        ...createdSession,
        paperCount: testForm.selectedSubjects.length,
      } as TestSession;
      await loadPapers(fullSession);
    } catch {
      setMessage("Test create nahi hua. Backend check karo.");
    } finally {
      setSavingTest(false);
    }
  };

  const openEditSession = (session: TestSession) => {
    setMessage("");
    setEditingSession(session);
    setEditForm({
      title: session.title ?? "",
      type: session.type ?? "weekly-test",
      testDate: String(session.testDate ?? "").slice(0, 10),
      instructions: session.instructions ?? "",
      status: session.status ?? "scheduled",
    });
    setEditOpen(true);
  };

  const saveSessionUpdate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingSession) return;
    if (!editForm.title.trim() || !editForm.testDate) {
      setMessage("Test Name aur Test Date required hai.");
      return;
    }

    setSavingEdit(true);
    setMessage("");

    try {
      const response = await fetch(`/api/exam-series/${editingSession.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          title: editForm.title.trim(),
          type: editForm.type,
          testDate: editForm.testDate,
          instructions: editForm.instructions.trim(),
          status: editForm.status,
        }),
      });

      if (!response.ok) {
        setMessage(await getError(response));
        return;
      }

      const updated = await response.json();
      setEditOpen(false);
      setEditingSession(null);

      await loadSessions(batchId);

      if (selectedSession?.id === updated.id) {
        await loadPapers(updated as TestSession);
      }
    } catch {
      setMessage("Test update nahi hua. Backend check karo.");
    } finally {
      setSavingEdit(false);
    }
  };

  const openMarks = async (paper: SubjectPaper) => {
    setSelectedPaper(paper);
    setMarksOpen(true);
    setLoadingMarks(true);
    setMessage("");

    try {
      const response = await fetch(`/api/exams/${paper.id}/marks`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        setMessage(await getError(response));
        setMarks([]);
        return;
      }

      setMarks(await response.json());
    } catch {
      setMessage("Students ke marks load nahi hue.");
      setMarks([]);
    } finally {
      setLoadingMarks(false);
    }
  };

  const updateMark = (studentId: string, value: string) => {
    setMarks((old) =>
      old.map((row) =>
        row.studentId === studentId ? { ...row, marksObtained: value } : row
      )
    );
  };

  const saveMark = async (row: MarkRow) => {
    if (!selectedPaper) return;

    const marksObtained = Number(row.marksObtained);

    if (
      !Number.isFinite(marksObtained) ||
      marksObtained < 0 ||
      marksObtained > selectedPaper.totalMarks
    ) {
      setMessage(`Marks 0 se ${selectedPaper.totalMarks} ke beech honi chahiye.`);
      return;
    }

    setSavingMarks(row.studentId);

    try {
      const response = await fetch(`/api/exams/${selectedPaper.id}/marks`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          studentId: row.studentId,
          marksObtained,
          remarks: row.remarks ?? "",
        }),
      });

      if (!response.ok) {
        setMessage(await getError(response));
        return;
      }

      const saved = await response.json();

      setMarks((old) =>
        old.map((item) =>
          item.studentId === row.studentId ? { ...item, ...saved } : item
        )
      );
    } catch {
      setMessage("Marks save nahi hue.");
    } finally {
      setSavingMarks(null);
    }
  };

  const pageLabel = pageType === "computer" ? "Computer Test Manager" : "Academic Test Manager";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-gradient-to-r from-slate-950 to-slate-800 px-6 py-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Second School Classes
            </p>
            <h1 className="mt-1 text-3xl font-extrabold">{pageLabel}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              Ek hi screen par Test banao, subjects choose karo, marks bharo aur result history dekho.
            </p>
          </div>
          <Button
            size="lg"
            className="bg-white text-slate-900 hover:bg-slate-100"
            onClick={() => {
              setMessage("");
              setTestForm(newTest());
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-5 w-5" />
            Create New Test
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><CalendarDays className="h-5 w-5" /></div>
            <div><div className="text-xs text-muted-foreground">Test History</div><div className="text-xl font-bold">{sessions.length}</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-slate-100 p-2 text-slate-700"><BookOpen className="h-5 w-5" /></div>
            <div><div className="text-xs text-muted-foreground">Selected Test Subjects</div><div className="text-xl font-bold">{papers.length}</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-green-100 p-2 text-green-700"><Users className="h-5 w-5" /></div>
            <div><div className="text-xs text-muted-foreground">Easy Flow</div><div className="text-sm font-semibold">Create → Marks → Result</div></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Step 1 — Choose Course and Batch</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <SearchableSelect
            label="Course"
            value={courseId}
            placeholder="Search and select course"
            options={courseList.map((course) => ({
              label: course.name,
              value: course.id,
              subLabel: pageType === "computer" ? "Computer Course" : "Academic Course",
            }))}
            onChange={(value) => {
              setCourseId(value);
              setBatchId("");
              setSelectedSession(null);
              setPapers([]);
            }}
          />
          <SearchableSelect
            label="Batch"
            value={batchId}
            placeholder={courseId ? "Search and select batch" : "Select Course first"}
            disabled={!courseId}
            options={filteredBatches.map((batch) => ({
              label: batch.name,
              value: batch.id,
              subLabel: selectedCourse?.name || "Batch",
            }))}
            onChange={(value) => {
              setBatchId(value);
              setSelectedSession(null);
              setPapers([]);
            }}
          />
        </CardContent>
      </Card>

      {message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.4fr]">
        <Card>
          <CardHeader className="space-y-3 border-b">
            <CardTitle className="text-lg">Step 2 — Test History</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search test name or date..."
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {!batchId ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Step 1 me Batch select karo.
              </div>
            ) : loadingSessions ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading tests...</div>
            ) : visibleSessions.length ? (
              visibleSessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-xl border p-4 transition ${
                    selectedSession?.id === session.id ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => loadPapers(session)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold">{session.title}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(session.testDate)}</span>
                          <span>•</span>
                          <span>{typeLabel(session.type)}</span>
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {session.paperCount} Subject{session.paperCount === 1 ? "" : "s"}
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEditSession(session)}
                      className="h-8"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Update Test
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <CalendarDays className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
                <div className="font-semibold">No test created yet</div>
                <div className="mt-1 text-sm text-muted-foreground">Create New Test button se pehla test banao.</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">
              {selectedSession ? `Step 3 — ${selectedSession.title}` : "Step 3 — Select a Test"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {!selectedSession ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <BookOpen className="mb-3 h-9 w-9 text-muted-foreground" />
                <div className="font-semibold">Test select karo</div>
                <div className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Left side se test select karte hi uske saare subjects aur Marks buttons dikhenge.
                </div>
              </div>
            ) : loadingPapers ? (
              <div className="p-12 text-center text-sm text-muted-foreground">Loading subjects...</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold">{selectedSession.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {formatDate(selectedSession.testDate)} • {typeLabel(selectedSession.type)}
                      </div>
                    </div>
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      {papers.length} Subject Paper{papers.length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                {papers.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {papers.map((paper) => (
                      <div key={paper.id} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-bold">{paper.subjectName}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{paper.name}</div>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="mt-4 grid grid-cols-2 rounded-lg bg-slate-50 text-center text-xs">
                          <div className="border-r p-2"><span className="block text-muted-foreground">Total</span><b>{paper.totalMarks}</b></div>
                          <div className="p-2"><span className="block text-muted-foreground">Passing</span><b>{paper.passingMarks}</b></div>
                        </div>
                        <Button className="mt-4 w-full" variant="outline" onClick={() => openMarks(paper)}>
                          <ClipboardPenLine className="mr-2 h-4 w-4" />
                          Enter Marks
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Is test me koi subject paper nahi mila.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Test</DialogTitle>
          </DialogHeader>

          <form onSubmit={createTest} className="space-y-5">
            <div className="rounded-lg bg-primary/5 p-3 text-sm text-primary">
              Ek baar me Test create karo aur neeche subjects select karo. Alag-alag subject papers banane ki zarurat nahi padegi.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Test / Exam Name</label>
                <Input
                  className="mt-1"
                  value={testForm.title}
                  onChange={(event) => setTestForm((old) => ({ ...old, title: event.target.value }))}
                  placeholder="Example: Weekly Test 1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Test Type</label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={testForm.type}
                  onChange={(event) => setTestForm((old) => ({ ...old, type: event.target.value }))}
                >
                  {TEST_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Test Date</label>
                <Input
                  className="mt-1"
                  type="date"
                  value={testForm.testDate}
                  onChange={(event) => setTestForm((old) => ({ ...old, testDate: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Total Marks</label>
                <Input
                  className="mt-1"
                  type="number"
                  min="1"
                  value={testForm.totalMarks}
                  onChange={(event) => setTestForm((old) => ({ ...old, totalMarks: event.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Passing Marks</label>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  value={testForm.passingMarks}
                  onChange={(event) => setTestForm((old) => ({ ...old, passingMarks: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Select Subjects</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {availableSubjects.map((subject) => {
                  const checked = testForm.selectedSubjects.includes(subject.id);
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => toggleSubject(subject.id)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition ${
                        checked ? "border-primary bg-primary/5" : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">{subject.name}</span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-white" : "border-slate-300"}`}>
                        {checked ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
                {!availableSubjects.length ? (
                  <div className="col-span-full rounded border border-dashed p-4 text-sm text-muted-foreground">
                    Is batch/course me Subject add nahi hai. Pehle Subjects section me subjects add karo.
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Instructions (Optional)</label>
              <Textarea
                className="mt-1"
                rows={3}
                value={testForm.instructions}
                onChange={(event) => setTestForm((old) => ({ ...old, instructions: event.target.value }))}
                placeholder="Students ke liye instructions..."
              />
            </div>

            <Button className="w-full" disabled={savingTest}>
              {savingTest ? "Creating Test..." : "Create Test with Selected Subjects"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Test / Exam</DialogTitle>
          </DialogHeader>

          <form onSubmit={saveSessionUpdate} className="space-y-4">
            <div className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">
              Isse Test Name, Date, Type, Status aur Instructions update honge. Existing subject papers aur entered marks safe rahenge.
            </div>

            <div>
              <label className="text-sm font-medium">Test / Exam Name</label>
              <Input
                className="mt-1"
                value={editForm.title}
                onChange={(event) => setEditForm((old) => ({ ...old, title: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Test Type</label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={editForm.type}
                  onChange={(event) => setEditForm((old) => ({ ...old, type: event.target.value }))}
                >
                  {TEST_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Test Date</label>
                <Input
                  className="mt-1"
                  type="date"
                  value={editForm.testDate}
                  onChange={(event) => setEditForm((old) => ({ ...old, testDate: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={editForm.status}
                onChange={(event) => setEditForm((old) => ({ ...old, status: event.target.value }))}
              >
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Instructions</label>
              <Textarea
                className="mt-1"
                rows={3}
                value={editForm.instructions}
                onChange={(event) => setEditForm((old) => ({ ...old, instructions: event.target.value }))}
                placeholder="Students ke liye instructions..."
              />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={savingEdit}>
                {savingEdit ? "Updating..." : "Update Test"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={marksOpen} onOpenChange={setMarksOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Enter Marks — {selectedPaper?.subjectName} ({selectedPaper?.totalMarks})
            </DialogTitle>
          </DialogHeader>

          {loadingMarks ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading students...</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-3 text-left">Student</th>
                    <th className="p-3 text-center">Marks</th>
                    <th className="p-3 text-center">Grade</th>
                    <th className="p-3 text-center">Result</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {marks.map((row) => (
                    <tr key={row.studentId} className="border-t">
                      <td className="p-3">
                        <div className="font-semibold">{row.studentName}</div>
                        <div className="text-xs text-muted-foreground">{row.studentCode}</div>
                      </td>
                      <td className="p-3 text-center">
                        <Input
                          className="mx-auto h-9 w-24 text-center"
                          type="number"
                          min="0"
                          max={selectedPaper?.totalMarks}
                          value={row.marksObtained ?? ""}
                          onChange={(event) => updateMark(row.studentId, event.target.value)}
                        />
                      </td>
                      <td className="p-3 text-center font-bold">{row.grade || "-"}</td>
                      <td className="p-3 text-center">
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold">
                          {row.resultStatus === "pass" ? "PASS" : row.resultStatus === "fail" ? "FAIL" : "PENDING"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => saveMark(row)}
                          disabled={savingMarks === row.studentId}
                        >
                          {savingMarks === row.studentId ? "Saving..." : "Save"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!marks.length ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No students found in this batch.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
