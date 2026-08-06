import {
  useListStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useListBatches,
  useListCourses,
  getListStudentsQueryKey,
} from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Pencil, Trash2, Upload, UserRound, Download, FileText, Eye, X } from "lucide-react";

type StudentDocument = {
  label: string;
  name: string;
  dataUrl: string;
  mimeType: string;
};

type StudentForm = {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  schoolName: string;
  className: string;
  section: string;
  board: string;
  lastClassPercentage: string;
  lastClassMarks: string;
  photoDataUrl: string;
  documents: StudentDocument[];
  courseId: string;
  batchId: string;
  academicYear: string;
  motherName: string;
  motherOccupation: string;
  motherPhone: string;
  motherWhatsapp: string;
  fatherName: string;
  fatherOccupation: string;
  fatherPhone: string;
  fatherWhatsapp: string;
  emergencyPhone: string;
  correspondenceAddress: string;
  correspondenceDistrict: string;
  correspondenceState: string;
  correspondencePin: string;
  permanentAddress: string;
  permanentDistrict: string;
  permanentState: string;
  permanentPin: string;
  status: "active" | "inactive";
};

const blankForm: StudentForm = {
  name: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  schoolName: "",
  className: "",
  section: "",
  board: "",
  lastClassPercentage: "",
  lastClassMarks: "",
  photoDataUrl: "",
  documents: [],
  courseId: "",
  batchId: "",
  academicYear: "2026-2027",
  motherName: "",
  motherOccupation: "",
  motherPhone: "",
  motherWhatsapp: "",
  fatherName: "",
  fatherOccupation: "",
  fatherPhone: "",
  fatherWhatsapp: "",
  emergencyPhone: "",
  correspondenceAddress: "",
  correspondenceDistrict: "",
  correspondenceState: "",
  correspondencePin: "",
  permanentAddress: "",
  permanentDistrict: "",
  permanentState: "",
  permanentPin: "",
  status: "active",
};

const CLASS_OPTIONS = [
  "NURSERY",
  "L.K.G",
  "U.K.G",
  ...Array.from({ length: 12 }, (_, index) => [
    `${index + 1}`,
    //`CLASS ${index + 1} - ICSE`,
  ]).flat(),
];

const BOARD_OPTIONS = ["CBSE", "ICSE", "UP Board", "Other"];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-primary px-4 py-2 text-center font-bold text-primary-foreground">
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required ? " *" : ""}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SearchableDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchText.toLowerCase())
  );

  const selectOption = (option: string) => {
    onChange(option);
    setSearchText(option);
    setActiveIndex(-1);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((old) =>
        filteredOptions.length === 0 ? -1 : Math.min(old + 1, filteredOptions.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((old) =>
        filteredOptions.length === 0 ? -1 : Math.max(old - 1, 0)
      );
      return;
    }

    if (event.key === "Enter") {
      if (open && filteredOptions.length > 0) {
        event.preventDefault();
        selectOption(filteredOptions[activeIndex >= 0 ? activeIndex : 0]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSearchText(value);
      setActiveIndex(-1);
      setOpen(false);
    }
  };

  return (
    <div className="relative space-y-1.5">
      <Label>{label}</Label>

      <Input
        value={searchText}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(-1);
        }}
        onChange={(event) => {
          setSearchText(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          window.setTimeout(() => {
            setSearchText(value);
            setActiveIndex(-1);
            setOpen(false);
          }, 150);
        }}
      />

      <button
        type="button"
        aria-label={`Open ${label} options`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setSearchText(value);
          setOpen((old) => !old);
          setActiveIndex(-1);
        }}
        className="absolute right-2 top-[31px] flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted"
      >
        <span className="text-xs">▼</span>
      </button>

      {open ? (
        <div className="absolute z-50 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
                className={`flex w-full rounded-sm px-3 py-2 text-left text-sm ${
                  index === activeIndex ? "bg-muted font-medium" : "hover:bg-muted"
                }`}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matching option found. Please choose from the available list.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

type DropdownOption = {
  label: string;
  value: string;
};

function SearchableOptionDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";
  const [searchText, setSearchText] = useState(selectedLabel);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchText.toLowerCase())
  );

  const selectOption = (option: DropdownOption) => {
    onChange(option.value);
    setSearchText(option.label);
    setActiveIndex(-1);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((old) =>
        filteredOptions.length === 0 ? -1 : Math.min(old + 1, filteredOptions.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((old) =>
        filteredOptions.length === 0 ? -1 : Math.max(old - 1, 0)
      );
      return;
    }

    if (event.key === "Enter") {
      if (open && filteredOptions.length > 0) {
        event.preventDefault();
        selectOption(filteredOptions[activeIndex >= 0 ? activeIndex : 0]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setSearchText(selectedLabel);
      setActiveIndex(-1);
      setOpen(false);
    }
  };

  return (
    <div className="relative space-y-1.5">
      <Label>{label}</Label>

      <Input
        value={searchText}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(-1);
        }}
        onChange={(event) => {
          setSearchText(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          window.setTimeout(() => {
            setSearchText(selectedLabel);
            setActiveIndex(-1);
            setOpen(false);
          }, 150);
        }}
      />

      <button
        type="button"
        aria-label={`Open ${label} options`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setSearchText(selectedLabel);
          setOpen((old) => !old);
          setActiveIndex(-1);
        }}
        className="absolute right-2 top-[31px] flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted"
      >
        <span className="text-xs">▼</span>
      </button>

      {open ? (
        <div className="absolute z-50 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
                className={`flex w-full rounded-sm px-3 py-2 text-left text-sm ${
                  index === activeIndex ? "bg-muted font-medium" : "hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matching option found. Please choose from the available list.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function Students() {
  const [location] = useLocation();
  const studentCategory = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("category");
  const pageTitle =
    studentCategory === "academic"
      ? "Academic Students"
      : studentCategory === "computer"
        ? "Computer Students"
        : "Students";

  const queryClient = useQueryClient();
  const { data: students, isLoading } = useListStudents();
  const { data: courses } = useListCourses();
  const { data: batches } = useListBatches();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [form, setForm] = useState<StudentForm>(blankForm);

  const setValue = (key: keyof StudentForm, value: string) => {
    setForm((old) => ({ ...old, [key]: value }));
  };

  const visibleCourses = useMemo(() => {
    return (courses ?? []).filter((course: any) => {
      if (studentCategory !== "academic" && studentCategory !== "computer") return true;
      return (course.courseType ?? "academic") === studentCategory;
    });
  }, [courses, studentCategory]);

  const filteredBatches = useMemo(() => {
    return (batches ?? []).filter((batch: any) => {
      const linkedCourse = (courses ?? []).find(
        (course: any) => course.id === batch.courseId
      ) as any;

      const isCorrectCategory =
        studentCategory !== "academic" &&
        studentCategory !== "computer"
          ? true
          : (linkedCourse?.courseType ?? "academic") === studentCategory;

      const isSelectedCourse =
        !form.courseId || batch.courseId === form.courseId;

      return isCorrectCategory && isSelectedCourse;
    });
  }, [batches, courses, form.courseId, studentCategory]);

  const openAdd = () => {
    setEditingStudent(null);
    setForm(blankForm);
    setDialogOpen(true);
  };

  const openEdit = (student: any) => {
    setEditingStudent(student);
    setForm({
      ...blankForm,
      name: student.name ?? "",
      phone: student.phone ?? "",
      email: student.email ?? "",
      dateOfBirth: student.dateOfBirth ?? "",
      gender: student.gender ?? "",
      schoolName: student.schoolName ?? "",
      className: student.className ?? "",
      section: student.section ?? "",
      board: student.board ?? "",
      lastClassPercentage: student.lastClassPercentage ?? "",
      lastClassMarks: student.lastClassMarks ?? "",
      photoDataUrl: student.photoDataUrl ?? "",
      documents: Array.isArray(student.documents) ? student.documents : [],
      courseId: student.courseId ?? "",
      batchId: student.batchId ?? "",
      academicYear: student.academicYear ?? "2026-2027",
      motherName: student.motherName ?? "",
      motherOccupation: student.motherOccupation ?? "",
      motherPhone: student.motherPhone ?? "",
      motherWhatsapp: student.motherWhatsapp ?? "",
      fatherName: student.fatherName ?? student.parentName ?? "",
      fatherOccupation: student.fatherOccupation ?? "",
      fatherPhone: student.fatherPhone ?? student.parentPhone ?? "",
      fatherWhatsapp: student.fatherWhatsapp ?? "",
      emergencyPhone: student.emergencyPhone ?? "",
      correspondenceAddress: student.correspondenceAddress ?? student.address ?? "",
      correspondenceDistrict: student.correspondenceDistrict ?? "",
      correspondenceState: student.correspondenceState ?? "",
      correspondencePin: student.correspondencePin ?? "",
      permanentAddress: student.permanentAddress ?? "",
      permanentDistrict: student.permanentDistrict ?? "",
      permanentState: student.permanentState ?? "",
      permanentPin: student.permanentPin ?? "",
      status: student.status === "inactive" ? "inactive" : "active",
    });
    setDialogOpen(true);
  };

  const handlePhotoChange = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }

    if (file.size > 1_500_000) {
      alert("Please choose a photo smaller than 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setValue("photoDataUrl", String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentChange = (label: string, file?: File) => {
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only PDF, JPG, PNG or WEBP files are allowed.");
      return;
    }

    if (file.size > 3_000_000) {
      alert("Please choose a document smaller than 3 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const newDocument: StudentDocument = {
        label,
        name: file.name,
        dataUrl: String(reader.result || ""),
        mimeType: file.type,
      };

      setForm((old) => ({
        ...old,
        documents: [
          ...old.documents.filter((document) => document.label !== label),
          newDocument,
        ],
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (label: string) => {
    setForm((old) => ({
      ...old,
      documents: old.documents.filter((document) => document.label !== label),
    }));
  };

  const getDocument = (label: string) =>
    form.documents.find((document) => document.label === label);

  const downloadAdmissionForm = (student: any) => {
    const safe = (value: unknown) =>
      String(value ?? "-")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const formatDate = (value: unknown) => {
      if (!value) return "—";
      const text = String(value);
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const [year, month, day] = text.split("-");
        return `${day}/${month}/${year}`;
      }
      return text;
    };

    const photo = student.photoDataUrl
      ? `<img class="student-photo" src="${student.photoDataUrl}" alt="Student photo" />`
      : `<div class="photo-placeholder">Affix a recent<br/>Passport size<br/>Photograph</div>`;

    const admissionDate = formatDate(student.createdAt);
    const courseAndBatch = `${safe(student.courseName)}${student.batchName ? ` — ${safe(student.batchName)}` : ""}`;

    const popup = window.open("", "_blank", "width=980,height=900");

    if (!popup) {
      alert("Popup blocked. Please allow popups and try again.");
      return;
    }

    popup.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Admission Form - ${safe(student.name)}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }

            * { box-sizing: border-box; }

            body {
              margin: 0;
              color: #151515;
              font-family: "Times New Roman", Georgia, serif;
              background: #f1f1f1;
            }

            .page {
              width: 210mm;
              height: 297mm;
              margin: 0 auto;
              padding: 4mm;
              background: #ffffff;
              border: 5px solid #3d2f95;
              position: relative;
              overflow: hidden;
              page-break-after: always;
            }

            .page:last-child { page-break-after: auto; }

            .original-header {
              display: block;
              width: 100%;
              height: auto;
              margin: 0;
            }

            .form-shell {
              margin: 3mm 2mm 0;
              border: 1.5px solid #e73121;
              border-radius: 8mm;
              padding: 3mm;
            }

            .main-title {
              margin: 0 0 2mm;
              font: 800 18px Arial, sans-serif;
              text-align: center;
              text-decoration: underline;
              letter-spacing: .3px;
            }

            .note {
              margin: 0 0 3mm;
              text-align: center;
              font-size: 9px;
              font-weight: 700;
            }

            .section-title {
              margin: 0;
              padding: 1.5mm 3mm;
              background: #e73121;
              color: #ffffff;
              font-size: 16px;
              font-weight: 800;
              text-align: center;
            }

            .section-box {
              border: 1px solid #e73121;
              border-top: 0;
              padding: 2.5mm 3mm 2mm;
            }

            .row {
              display: flex;
              align-items: flex-end;
              gap: 3mm;
              margin-bottom: 2.5mm;
              min-height: 5.5mm;
              font-size: 11.5px;
              font-weight: 700;
            }

            .row:last-child { margin-bottom: 0; }

            .field {
              display: inline-flex;
              min-width: 0;
              align-items: flex-end;
              gap: 1mm;
              flex: 1;
            }

            .field.small { flex: 0 0 25%; }
            .field.medium { flex: 0 0 43%; }

            .label { white-space: nowrap; }
            .value {
              min-width: 0;
              flex: 1;
              padding: 0 1mm 1mm;
              border-bottom: 1px dotted #222;
              overflow-wrap: anywhere;
              font-weight: 700;
            }

            .student-info {
              display: grid;
              grid-template-columns: 1fr 31mm;
              gap: 3mm;
            }

            .photo-placeholder,
            .student-photo {
              width: 31mm;
              height: 39mm;
              border: 1.5px solid #171717;
              object-fit: cover;
            }

            .photo-placeholder {
              display: grid;
              place-items: center;
              text-align: center;
              font-size: 9px;
              font-weight: 700;
              line-height: 1.2;
            }

            .rules {
              border: 1px solid #e73121;
              border-top: 0;
              padding: 2mm 4mm 2mm 8mm;
              font-size: 10.5px;
              font-weight: 700;
              line-height: 1.35;
            }

            .rules ol { margin: 0; padding-left: 5mm; }

            .footer {
              margin-top: 3mm;
              background: #ffffff;
              border-top: 3px solid #3d2f95;
              padding: 2mm 4mm;
              text-align: center;
              font: 700 9px Arial, sans-serif;
              line-height: 1.4;
            }

            .declaration {
              border: 1px solid #e73121;
              border-top: 0;
              padding: 4mm;
              font-size: 12.3px;
              font-weight: 700;
              line-height: 1.75;
              min-height: 170mm;
              text-align: justify;
            }

            .declaration .line {
              display: inline-block;
              min-width: 55mm;
              border-bottom: 1px dotted #222;
              vertical-align: baseline;
            }

            .signature-row {
              margin-top: 14mm;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 14mm;
              font-size: 11px;
              text-align: left;
            }

            .signature-box { padding-top: 7mm; }
            .signature-line { border-top: 1px dotted #222; padding-top: 1.5mm; font-weight: 800; }

            .office {
              border: 1px solid #e73121;
              border-top: 0;
              padding: 3mm;
              font-size: 11.5px;
              font-weight: 700;
              line-height: 1.6;
            }

            .office .office-row {
              display: flex;
              gap: 3mm;
              margin-bottom: 1.5mm;
            }

            .office .office-label { white-space: nowrap; }
            .office .office-value { flex: 1; border-bottom: 1px dotted #222; }

            @media print {
              html, body {
                width: 210mm;
                height: 297mm;
                background: #ffffff;
              }
              .page {
                width: 210mm;
                height: 297mm;
                margin: 0;
              }
            }
          </style>
        </head>

        <body>
          <section class="page">
            <img class="original-header" src="/admission-form-original-header.png" alt="Second School Admission Form Header" />

            <div class="form-shell">
              <h1 class="main-title">REGISTRATION CUM ADMISSION FORM</h1>
              <p class="note">Use Blue/Black Ball Point Pen to Fill This Form as per Document Submitted</p>

              <div class="section-title">Student’s Information</div>
              <div class="section-box">
                <div class="student-info">
                  <div>
                    <div class="row">
                      <div class="field">
                        <span class="label">Student’s Name :</span>
                        <span class="value">${safe(student.name)}</span>
                      </div>
                    </div>
                    <div class="row">
                      <div class="field medium">
                        <span class="label">Date of Birth :</span>
                        <span class="value">${safe(formatDate(student.dateOfBirth))}</span>
                      </div>
                      <div class="field">
                        <span class="label">Gender :</span>
                        <span class="value">${safe(student.gender ? String(student.gender).replace(/^./, (v) => v.toUpperCase()) : "")}</span>
                      </div>
                    </div>
                    <div class="row">
                      <div class="field">
                        <span class="label">School’s Name :</span>
                        <span class="value">${safe(student.schoolName)}</span>
                      </div>
                    </div>
                    <div class="row">
                      <div class="field small">
                        <span class="label">Class :</span>
                        <span class="value">${safe(student.className)}</span>
                      </div>
                      <div class="field small">
                        <span class="label">Section :</span>
                        <span class="value">${safe(student.section)}</span>
                      </div>
                      <div class="field">
                        <span class="label">Board :</span>
                        <span class="value">${safe(student.board)}</span>
                      </div>
                    </div>
                    <div class="row">
                      <div class="field medium">
                        <span class="label">Percentage of Last Class :</span>
                        <span class="value">${safe(student.lastClassPercentage)}</span>
                      </div>
                      <div class="field">
                        <span class="label">Marks Obtained in Last Class :</span>
                        <span class="value">${safe(student.lastClassMarks)}</span>
                      </div>
                    </div>
                  </div>
                  ${photo}
                </div>
              </div>

              <div style="height:3mm"></div>

              <div class="section-title">Parent’s Information</div>
              <div class="section-box">
                <div class="row">
                  <div class="field">
                    <span class="label">Mother’s Name :</span>
                    <span class="value">${safe(student.motherName)}</span>
                  </div>
                  <div class="field medium">
                    <span class="label">Occupation :</span>
                    <span class="value">${safe(student.motherOccupation)}</span>
                  </div>
                </div>
                <div class="row">
                  <div class="field">
                    <span class="label">Father’s Name :</span>
                    <span class="value">${safe(student.fatherName ?? student.parentName)}</span>
                  </div>
                  <div class="field medium">
                    <span class="label">Occupation :</span>
                    <span class="value">${safe(student.fatherOccupation)}</span>
                  </div>
                </div>
                <div class="row">
                  <div class="field">
                    <span class="label">Mother’s Contact Number :</span>
                    <span class="value">${safe(student.motherPhone)}</span>
                  </div>
                  <div class="field medium">
                    <span class="label">Whatsapp No. :</span>
                    <span class="value">${safe(student.motherWhatsapp)}</span>
                  </div>
                </div>
                <div class="row">
                  <div class="field">
                    <span class="label">Father’s Contact Number :</span>
                    <span class="value">${safe(student.fatherPhone ?? student.parentPhone)}</span>
                  </div>
                  <div class="field medium">
                    <span class="label">Whatsapp No. :</span>
                    <span class="value">${safe(student.fatherWhatsapp)}</span>
                  </div>
                </div>
                <div class="row">
                  <div class="field medium">
                    <span class="label">Emergency Contact Number :</span>
                    <span class="value">${safe(student.emergencyPhone)}</span>
                  </div>
                  <div class="field">
                    <span class="label">E-mail ID :</span>
                    <span class="value">${safe(student.email)}</span>
                  </div>
                </div>
                <div class="row">
                  <div class="field">
                    <span class="label">Correspondence Address :</span>
                    <span class="value">${safe(student.correspondenceAddress)}</span>
                  </div>
                </div>
                <div class="row">
                  <div class="field small"><span class="label">District :</span><span class="value">${safe(student.correspondenceDistrict)}</span></div>
                  <div class="field medium"><span class="label">State :</span><span class="value">${safe(student.correspondenceState)}</span></div>
                  <div class="field small"><span class="label">PIN :</span><span class="value">${safe(student.correspondencePin)}</span></div>
                </div>
                <div class="row">
                  <div class="field">
                    <span class="label">Permanent Address :</span>
                    <span class="value">${safe(student.permanentAddress)}</span>
                  </div>
                </div>
                <div class="row">
                  <div class="field small"><span class="label">District :</span><span class="value">${safe(student.permanentDistrict)}</span></div>
                  <div class="field medium"><span class="label">State :</span><span class="value">${safe(student.permanentState)}</span></div>
                  <div class="field small"><span class="label">PIN :</span><span class="value">${safe(student.permanentPin)}</span></div>
                </div>
              </div>

              <div style="height:3mm"></div>

              <div class="section-title">RULES &amp; REGULATIONS</div>
              <div class="rules">
                <ol>
                  <li>Fees once paid will not be refunded under any circumstances.</li>
                  <li>Fees must be paid before the due date.</li>
                  <li>Late fee may be charged after due date 50 Rupees per day.</li>
                  <li>Students must maintain discipline inside the institute.</li>
                  <li>Mobile phones are not allowed during class.</li>
                  <li>Any damage to institute property will be chargeable.</li>
                </ol>
              </div>
            </div>

            <div class="footer">
              MIG 88, PRITAM NAGAR, DHOOMANGANJ, PRAYAGRAJ-211011 &nbsp;|&nbsp; Contact No.: 7844997666<br/>
              DRUMMOND ROAD, CIVIL LINES, PRAYAGRAJ - 211001 &nbsp;|&nbsp; YouTube: /secondschoolclasses
            </div>
          </section>

          <section class="page">
            <img class="original-header" src="/admission-form-original-header.png" alt="Second School Admission Form Header" />

            <div class="form-shell">
              <div class="section-title">Declaration</div>
              <div class="declaration">
                My son/daughter, <span class="line">${safe(student.name)}</span>, a student of Class
                <span class="line">${safe(student.className)}</span> at School
                <span class="line">${safe(student.schoolName)}</span> is enrolled with Second School Classes.
                I hereby grant permission to Second School Classes to take photographs and videos of my
                son/daughter during classes and within the coaching premises. I understand that the coaching
                institute will utilize these photographs and videos for educational activities, as well as to
                inspire other students and educators. I am aware that these videos and photographs may be posted
                in a “Reels” format on platforms such as Facebook, Instagram, Twitter (X) and YouTube. I have no
                objection to this. I hereby grant permission to Second School Classes to proceed with this activity.
                I also understand that these videos may subsequently be shared or reshared by others.
                <br/><br/>
                I agree to ensure my child attends all classes and meets the attendance requirements. I will be
                responsible for my child's conduct while attending classes. I will cooperate with the coaching
                center in all matters related to my child's education. I agree to pay all fees and charges as
                outlined by the coaching center.

                <div class="signature-row">
                  <div class="signature-box">
                    <div>Date : ${safe(admissionDate)}</div>
                    <div style="margin-top:3mm">Place : Prayagraj</div>
                  </div>
                  <div class="signature-box">
                    <div class="signature-line">Signature of Father/Mother/Guardian</div>
                  </div>
                </div>
              </div>

              <div style="height:4mm"></div>

              <div class="section-title">For Office Use Only</div>
              <div class="office">
                <div class="office-row">
                  <span class="office-label">Student Registration/Admission Date :</span>
                  <span class="office-value">${safe(admissionDate)}</span>
                </div>
                <div class="office-row">
                  <span class="office-label">Student Registration Number :</span>
                  <span class="office-value">${safe(student.enrollmentNo)}</span>
                </div>
                <div class="office-row">
                  <span class="office-label">Student Roll Number :</span>
                  <span class="office-value"></span>
                  <span class="office-label">Student Registration Fee Rs. 100/-</span>
                  <span class="office-value"></span>
                </div>
                <div class="office-row">
                  <span class="office-label">Student Batch Number &amp; Time :</span>
                  <span class="office-value">${courseAndBatch}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              MIG 88, PRITAM NAGAR, DHOOMANGANJ, PRAYAGRAJ-211011 &nbsp;|&nbsp; Contact No.: 7844997666<br/>
              DRUMMOND ROAD, CIVIL LINES, PRAYAGRAJ - 211001 &nbsp;|&nbsp; YouTube: /secondschoolclasses
            </div>
          </section>

          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    popup.document.close();
  };

  const saveStudent = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.courseId || !form.batchId) {
      alert("Student Name, Contact Number, Course and Batch are required.");
      return;
    }

    const data: any = {
      ...form,
      gender: form.gender || undefined,
      email: form.email || undefined,
      parentName: form.fatherName || undefined,
      parentPhone: form.fatherPhone || undefined,
    };

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      setDialogOpen(false);
    };

    if (editingStudent) {
      updateStudent.mutate(
        { id: editingStudent.id, data },
        { onSuccess: refresh }
      );
    } else {
      createStudent.mutate({ data }, { onSuccess: refresh });
    }
  };

  const updateStudentStatus = (student: any, status: "active" | "inactive") => {
    if (student.status === status) return;

    updateStudent.mutate(
      {
        id: student.id,
        data: {
          status,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        },
        onError: () => {
          alert("Student status update nahi hua. Please try again.");
        },
      }
    );
  };

  const handleDelete = (student: any) => {
    if (!confirm("Delete " + student.name + "?")) return;

    deleteStudent.mutate(
      { id: student.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        },
      }
    );
  };

  const filteredStudents = (students ?? []).filter((student: any) => {
    const linkedCourse = (courses ?? []).find(
      (course: any) => course.id === student.courseId
    ) as any;

    const isCorrectCategory =
      studentCategory !== "academic" &&
      studentCategory !== "computer"
        ? true
        : (linkedCourse?.courseType ?? "academic") === studentCategory;

    if (!isCorrectCategory) return false;

    const studentStatus = student.status === "inactive" ? "inactive" : "active";
    if (statusFilter !== "all" && studentStatus !== statusFilter) return false;

    const query = search.toLowerCase();
    return (
      String(student.name ?? "").toLowerCase().includes(query) ||
      String(student.enrollmentNo ?? "").toLowerCase().includes(query) ||
      String(student.phone ?? "").toLowerCase().includes(query)
    );
  });

  const totalStudents = filteredStudents.length;
  const activeStudents = filteredStudents.filter(
    (student: any) => (student.status ?? "active") === "active"
  ).length;
  const inactiveStudents = totalStudents - activeStudents;

  const classSerialNumber = (className: unknown) => {
    const value = String(className ?? "").trim().toUpperCase();

    // Nursery, L.K.G and U.K.G should always come first.
    if (value === "NURSERY") return 1;
    if (value === "L.K.G" || value === "LKG" || value === "L.K.G.") return 2;
    if (value === "U.K.G" || value === "UKG" || value === "U.K.G.") return 3;

    // Supports all saved formats:
    // 1, 2, 10
    // CLASS 1, CLASS 2 - CBSE
    // CLASS 7 ICSE
    const numberMatch = value.match(/(?:CLASS\s*)?(\d{1,2})/);

    if (!numberMatch) return 9999;

    const classNumber = Number(numberMatch[1]);

    // Same class: CBSE first, then ICSE, then any other / blank board.
    const boardNumber =
      value.includes("CBSE") ? 0 :
      value.includes("ICSE") ? 1 :
      2;

    return 100 + classNumber * 10 + boardNumber;
  };

  const classWiseStudents = [...filteredStudents].sort((first: any, second: any) => {
    const classDifference =
      classSerialNumber(first.className) - classSerialNumber(second.className);

    if (classDifference !== 0) return classDifference;

    const firstBoard = String(first.board ?? "").toUpperCase();
    const secondBoard = String(second.board ?? "").toUpperCase();

    const boardDifference =
      (firstBoard === "CBSE" ? 0 : firstBoard === "ICSE" ? 1 : 2) -
      (secondBoard === "CBSE" ? 0 : secondBoard === "ICSE" ? 1 : 2);

    if (boardDifference !== 0) return boardDifference;

    return String(first.name ?? "").localeCompare(String(second.name ?? ""));
  });

  const saving = createStudent.isPending || updateStudent.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {studentCategory === "academic"
              ? "Manage academic student admission details"
              : studentCategory === "computer"
                ? "Manage computer student admission details"
                : "Manage student admission details"}
          </p>
        </div>

        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {studentCategory === "academic"
                ? "Total Academic Students"
                : studentCategory === "computer"
                  ? "Total Computer Students"
                  : "Total Students"}
            </p>
            <p className="mt-1 text-3xl font-bold">{totalStudents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active Students</p>
            <p className="mt-1 text-3xl font-bold text-green-600">{activeStudents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Inactive Students</p>
            <p className="mt-1 text-3xl font-bold text-slate-500">{inactiveStudents}</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingStudent ? "Edit Student Admission Form" : "Add Student Admission Form"}
            </DialogTitle>
            {studentCategory === "academic" || studentCategory === "computer" ? (
              <p className="text-sm text-muted-foreground">
                Student Type: {studentCategory === "academic" ? "Academic Student" : "Computer Student"}
              </p>
            ) : null}
          </DialogHeader>

          <div className="space-y-6 pb-2">
            <SectionTitle>Student’s Information</SectionTitle>

            <div className="grid gap-4 md:grid-cols-[1fr_170px]">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Student Name" value={form.name} onChange={(v) => setValue("name", v)} required />
                <Field label="Date of Birth" value={form.dateOfBirth} onChange={(v) => setValue("dateOfBirth", v)} type="date" />
                <SearchableOptionDropdown
                  label="Gender"
                  value={form.gender}
                  placeholder="Select gender"
                  options={[
                    { label: "Male", value: "male" },
                    { label: "Female", value: "female" },
                    { label: "Other", value: "other" },
                  ]}
                  onChange={(value) => setValue("gender", value)}
                />
                <Field label="Contact Number" value={form.phone} onChange={(v) => setValue("phone", v)} placeholder="Mobile number" required />
                <Field label="School Name" value={form.schoolName} onChange={(v) => setValue("schoolName", v)} />
                <Field label="Academic Year" value={form.academicYear} onChange={(v) => setValue("academicYear", v)} required />

              </div>

              <div className="rounded-lg border p-3">
                <Label>Student Photo</Label>
                <div className="mt-2 flex min-h-32 items-center justify-center overflow-hidden rounded border bg-muted">
                  {form.photoDataUrl ? (
                    <img src={form.photoDataUrl} alt="Student preview" className="h-32 w-full object-cover" />
                  ) : (
                    <div className="text-center text-xs text-muted-foreground">
                      <UserRound className="mx-auto mb-2 h-8 w-8" />
                      Passport Photo
                    </div>
                  )}
                </div>
                <label className="mt-3 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-medium hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handlePhotoChange(event.target.files?.[0])}
                  />
                </label>
                <p className="mt-2 text-xs text-muted-foreground">Maximum 1.5 MB</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <SearchableDropdown
                label="Class"
                value={form.className}
                options={CLASS_OPTIONS}
                placeholder="Select or type class"
                onChange={(value) => setValue("className", value)}
              />

              <Field label="Section" value={form.section} onChange={(v) => setValue("section", v)} placeholder="Example: A" />

              <SearchableDropdown
                label="Board"
                value={form.board}
                options={BOARD_OPTIONS}
                placeholder="Select or type board"
                onChange={(value) => setValue("board", value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Percentage of Last Class" value={form.lastClassPercentage} onChange={(v) => setValue("lastClassPercentage", v)} placeholder="Example: 82%" />
              <Field label="Marks Obtained in Last Class" value={form.lastClassMarks} onChange={(v) => setValue("lastClassMarks", v)} placeholder="Example: 410 / 500" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SearchableOptionDropdown
                label="Course *"
                value={form.courseId}
                placeholder="Search or select course"
                options={visibleCourses.map((course: any) => ({
                  label: course.name,
                  value: course.id,
                }))}
                onChange={(value) =>
                  setForm((old) => ({
                    ...old,
                    courseId: value,
                    batchId: "",
                  }))
                }
              />

              <SearchableOptionDropdown
                label="Batch *"
                value={form.batchId}
                placeholder={form.courseId ? "Search or select batch" : "Select course first"}
                options={filteredBatches.map((batch: any) => ({
                  label: batch.name,
                  value: batch.id,
                }))}
                onChange={(value) => setValue("batchId", value)}
              />
            </div>

            <div className="rounded-md border p-4">
              <div className="mb-1 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Document Upload</h3>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Upload PDF, JPG, PNG or WEBP files. Maximum size: 3 MB per document.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {["Aadhaar Card", "Birth Certificate", "Previous Class Marksheet", "Other Document"].map((label) => {
                  const document = getDocument(label);

                  return (
                    <div key={label} className="rounded-md border p-3">
                      <Label>{label}</Label>
                      {document ? (
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted p-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{document.name}</div>
                            <div className="text-xs text-muted-foreground">Uploaded</div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button type="button" size="icon" variant="ghost" title="View document" onClick={() => window.open(document.dataUrl, "_blank")}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="text-destructive" title="Remove document" onClick={() => removeDocument(label)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <label className="mt-2 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border text-sm font-medium hover:bg-muted">
                          <Upload className="h-4 w-4" />
                          Upload Document
                          <input
                            type="file"
                            accept=".pdf,image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(event) => handleDocumentChange(label, event.target.files?.[0])}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <SectionTitle>Parent’s Information</SectionTitle>

            <div className="rounded-md border p-4">
              <h3 className="mb-4 font-semibold">Mother’s Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Mother’s Name" value={form.motherName} onChange={(v) => setValue("motherName", v)} />
                <Field label="Occupation" value={form.motherOccupation} onChange={(v) => setValue("motherOccupation", v)} />
                <Field label="Contact Number" value={form.motherPhone} onChange={(v) => setValue("motherPhone", v)} />
                <Field label="WhatsApp Number" value={form.motherWhatsapp} onChange={(v) => setValue("motherWhatsapp", v)} />
              </div>
            </div>

            <div className="rounded-md border p-4">
              <h3 className="mb-4 font-semibold">Father’s Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Father’s Name" value={form.fatherName} onChange={(v) => setValue("fatherName", v)} />
                <Field label="Occupation" value={form.fatherOccupation} onChange={(v) => setValue("fatherOccupation", v)} />
                <Field label="Contact Number" value={form.fatherPhone} onChange={(v) => setValue("fatherPhone", v)} />
                <Field label="WhatsApp Number" value={form.fatherWhatsapp} onChange={(v) => setValue("fatherWhatsapp", v)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Emergency Contact Number" value={form.emergencyPhone} onChange={(v) => setValue("emergencyPhone", v)} />
              <Field label="E-mail ID" value={form.email} onChange={(v) => setValue("email", v)} type="email" />
            </div>

            <div className="rounded-md border p-4">
              <h3 className="mb-4 font-semibold">Correspondence Address</h3>
              <div className="grid gap-4">
                <Field label="Address" value={form.correspondenceAddress} onChange={(v) => setValue("correspondenceAddress", v)} />
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="District" value={form.correspondenceDistrict} onChange={(v) => setValue("correspondenceDistrict", v)} />
                  <Field label="State" value={form.correspondenceState} onChange={(v) => setValue("correspondenceState", v)} />
                  <Field label="PIN" value={form.correspondencePin} onChange={(v) => setValue("correspondencePin", v)} />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Permanent Address</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm((old) => ({
                      ...old,
                      permanentAddress: old.correspondenceAddress,
                      permanentDistrict: old.correspondenceDistrict,
                      permanentState: old.correspondenceState,
                      permanentPin: old.correspondencePin,
                    }))
                  }
                >
                  Same as Correspondence Address
                </Button>
              </div>

              <div className="grid gap-4">
                <Field label="Address" value={form.permanentAddress} onChange={(v) => setValue("permanentAddress", v)} />
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="District" value={form.permanentDistrict} onChange={(v) => setValue("permanentDistrict", v)} />
                  <Field label="State" value={form.permanentState} onChange={(v) => setValue("permanentState", v)} />
                  <Field label="PIN" value={form.permanentPin} onChange={(v) => setValue("permanentPin", v)} />
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={saveStudent} disabled={saving}>
              {saving ? "Saving..." : editingStudent ? "Update Student" : "Save Student Admission"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex max-w-sm items-center gap-2">
              <Search className="h-6 w-6 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID or phone..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
              >
                All Students
              </Button>
              <Button
                type="button"
                size="sm"
                variant={statusFilter === "active" ? "default" : "outline"}
                onClick={() => setStatusFilter("active")}
              >
                Active Students
              </Button>
              <Button
                type="button"
                size="sm"
                variant={statusFilter === "inactive" ? "default" : "outline"}
                onClick={() => setStatusFilter("inactive")}
              >
                Inactive Students
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Class / Board</TableHead>
                  <TableHead>Course / Batch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">Loading students...</TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {statusFilter === "inactive"
                        ? "No inactive students found"
                        : statusFilter === "active"
                          ? "No active students found"
                          : "No students found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  classWiseStudents.map((student: any) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {student.photoDataUrl ? (
                            <img src={student.photoDataUrl} alt={student.name} className="h-16 w-16 shrink-0 rounded-lg border object-cover" />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-muted">
                              <UserRound className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-xs text-muted-foreground">{student.phone}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.enrollmentNo}</TableCell>
                      <TableCell>
                        <div>{student.className || "-"}</div>
                        <div className="text-xs text-muted-foreground">{student.board || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div>{student.courseName || "-"}</div>
                        <div className="text-xs text-muted-foreground">{student.batchName || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={student.status === "inactive" ? "inactive" : "active"}
                          onValueChange={(value: "active" | "inactive") =>
                            updateStudentStatus(student, value)
                          }
                          disabled={updateStudent.isPending}
                        >
                          <SelectTrigger className="h-8 w-[118px] border-0 bg-transparent px-0 shadow-none focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              <Badge variant="default">Active</Badge>
                            </SelectItem>
                            <SelectItem value="inactive">
                              <Badge variant="secondary">Inactive</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download Admission Form"
                          onClick={() => downloadAdmissionForm(student)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit Student" onClick={() => openEdit(student)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(student)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
