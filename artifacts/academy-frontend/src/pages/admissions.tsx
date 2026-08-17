import { useListAdmissions, useListCourses, getListAdmissionsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, UserPlus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";

const enquirySchema = z.object({
  enquiryType: z.enum(["academic", "computer"]),
  studentName: z.string().trim().min(2, "Enter name"),
  className: z.string().optional(),
  board: z.string().optional(),
  courseInterest: z.string().optional(),
  phone: z.string().trim().min(10, "Enter valid contact number"),
  source: z.enum(["walk-in", "website", "referral", "social-media", "other"]).or(z.literal("")),
  enquiryDate: z.string().min(1, "Select date"),
  enquiryDay: z.string().optional(),
  remarks: z.string().optional(),
});

type EnquiryForm = z.infer<typeof enquirySchema>;

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  visited: "bg-purple-100 text-purple-700",
  enrolled: "bg-green-100 text-green-700",
  dropped: "bg-red-100 text-red-700",
};

const BOARD_PREFIX = "Board: ";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function dayFromDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", { weekday: "long" });
}

function displayDate(value?: string) {
  if (!value) return "-";
  const parts = String(value).split("-");
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : String(value);
}

function readRemarks(remarks?: string | null) {
  const lines = (remarks ?? "").split("\n");
  const board = (lines.find((line) => line.startsWith(BOARD_PREFIX)) ?? "")
    .replace(BOARD_PREFIX, "")
    .trim();

  const remark = lines
    .filter((line) => !line.startsWith(BOARD_PREFIX))
    .join("\n")
    .trim();

  return { board, remark };
}

function saveRemarks(board: string, remark?: string) {
  const cleanRemark = (remark ?? "").trim();
  return cleanRemark
    ? `${BOARD_PREFIX}${board}\n${cleanRemark}`
    : `${BOARD_PREFIX}${board}`;
}

function getAuthHeaders() {
  const token = localStorage.getItem("coach_sutra_token") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type DropdownOption = {
  label: string;
  value: string;
};

function SearchableDropdown({
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
      <label className="text-sm font-medium">{label}</label>

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
              No matching option found. Add an active Computer Course from Courses section first.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function Admissions() {
  const [location] = useLocation();
  const typeFromUrl = new URLSearchParams(location.split("?")[1] ?? window.location.search).get("type");
  const pageType = typeFromUrl === "academic" || typeFromUrl === "computer" ? typeFromUrl : null;
  const pageTitle = pageType === "academic" ? "Academic Enquiry" : pageType === "computer" ? "Computer Enquiry" : "Enquiry";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "contacted" | "visited" | "enrolled" | "dropped">("all");
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const { data: enquiries, isLoading } = useListAdmissions();
  const { data: allCourses } = useListCourses();
  const computerCourseOptions = ((allCourses ?? []) as any[])
    .filter((course) => (course.courseType ?? "academic") === "computer" && course.status === "active")
    .map((course) => ({ label: course.name, value: course.name }));
  const queryClient = useQueryClient();

  const defaults: EnquiryForm = {
    enquiryType: pageType ?? "academic",
    studentName: "",
    className: "",
    board: "",
    courseInterest: "",
    phone: "",
    source: "",
    enquiryDate: todayDate(),
    enquiryDay: dayFromDate(todayDate()),
    remarks: "",
  };

  const form = useForm<EnquiryForm>({
    resolver: zodResolver(enquirySchema),
    defaultValues: defaults,
  });

  const activeFormType = pageType ?? form.watch("enquiryType") ?? "academic";

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: getListAdmissionsQueryKey(),
    });
  };

  const openAdd = () => {
    setMessage("");
    setEditTarget(null);
    form.reset({ ...defaults, enquiryType: pageType ?? "academic", enquiryDate: todayDate(), enquiryDay: dayFromDate(todayDate()) });
    setOpen(true);
  };

  const openEdit = (enquiry: any) => {
    setMessage("");
    setEditTarget(enquiry);
    form.reset({
      enquiryType: (enquiry as any).enquiryType ?? "academic",
      studentName: enquiry.studentName ?? "",
      className: (enquiry as any).className ?? "",
      board: (enquiry as any).board ?? "",
      courseInterest: enquiry.courseInterest ?? "",
      phone: enquiry.phone ?? "",
      source: enquiry.source ?? "walk-in",
      enquiryDate: (enquiry as any).enquiryDate ?? String(enquiry.createdAt ?? "").slice(0, 10) ?? todayDate(),
      enquiryDay: (enquiry as any).enquiryDay ?? dayFromDate((enquiry as any).enquiryDate ?? String(enquiry.createdAt ?? "").slice(0, 10)),
      remarks: enquiry.remarks ?? "",
    });
    setOpen(true);
  };

  const getErrorText = async (response: Response) => {
    try {
      const result = await response.json();
      return result?.message || result?.error || "Please check all details and try again.";
    } catch {
      return "Please check all details and try again.";
    }
  };

  const onSubmit = async (values: EnquiryForm) => {
    setSaving(true);
    setMessage("");

    if (values.enquiryType === "academic" && (!values.className || !values.board)) {
      setMessage("Academic Enquiry ke liye Class aur Board select karo.");
      setSaving(false);
      return;
    }

    if (values.enquiryType === "computer" && !values.courseInterest?.trim()) {
      setMessage("Computer Enquiry ke liye Course select karo.");
      setSaving(false);
      return;
    }

    const selectedType = pageType ?? values.enquiryType ?? "academic";
    const enquiryDate = values.enquiryDate || todayDate();

    const data = {
      enquiryType: selectedType,
      enquiryDate,
      enquiryDay: dayFromDate(enquiryDate),
      studentName: values.studentName.trim(),
      className: selectedType === "academic" ? values.className : "",
      board: selectedType === "academic" ? values.board : "",
      courseInterest: selectedType === "computer" ? values.courseInterest?.trim() : "",
      phone: values.phone.trim(),
      source: values.source || undefined,
      remarks: values.remarks?.trim() ?? "",
    };

    try {
      const url = editTarget
        ? `/api/admissions/${editTarget.id}`
        : "/api/admissions";

      const response = await fetch(url, {
        method: editTarget ? "PATCH" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        setMessage(await getErrorText(response));
        return;
      }

      await refresh();
      setOpen(false);
      form.reset(defaults);
      setEditTarget(null);
    } catch {
      setMessage("Server se connection nahi ho raha. Backend run hai ya nahi, check karo.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/admissions/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        setMessage(await getErrorText(response));
        return;
      }

      await refresh();
    } catch {
      setMessage("Status update nahi hua. Backend check karo.");
    }
  };

  const deleteEnquiry = async (enquiry: any) => {
    const confirmed = window.confirm(
      `Do you want to delete ${enquiry.studentName} inquiry? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(enquiry.id);
    setMessage("");

    try {
      const response = await fetch(`/api/admissions/${enquiry.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        setMessage(await getErrorText(response));
        return;
      }

      await refresh();
    } catch {
      setMessage("Delete nahi hua. Backend check karo.");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered =
    enquiries?.filter((enquiry: any) => {
      const { board, remark } = readRemarks(enquiry.remarks);
      const term = search.toLowerCase();
      const enquiryType = (enquiry as any).enquiryType ?? "academic";

      if (pageType && enquiryType !== pageType) return false;
      if (statusFilter !== "all" && enquiry.status !== statusFilter) return false;

      return (
        enquiry.studentName.toLowerCase().includes(term) ||
        enquiry.phone.includes(search) ||
        ((enquiry as any).className ?? enquiry.courseInterest ?? "").toLowerCase().includes(term) ||
        (enquiry.courseInterest ?? "").toLowerCase().includes(term) ||
        ((enquiry as any).board ?? board ?? "").toLowerCase().includes(term) ||
        remark.toLowerCase().includes(term)
      );
    }) ?? [];

  const typeWiseEnquiries = (enquiries ?? []).filter((enquiry: any) =>
    !pageType || ((enquiry as any).enquiryType ?? "academic") === pageType
  );

  const statusCounts = {
    all: typeWiseEnquiries.length,
    new: typeWiseEnquiries.filter((enquiry: any) => enquiry.status === "new").length,
    contacted: typeWiseEnquiries.filter((enquiry: any) => enquiry.status === "contacted").length,
    visited: typeWiseEnquiries.filter((enquiry: any) => enquiry.status === "visited").length,
    enrolled: typeWiseEnquiries.filter((enquiry: any) => enquiry.status === "enrolled").length,
    dropped: typeWiseEnquiries.filter((enquiry: any) => enquiry.status === "dropped").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {pageType === "academic" ? "Manage academic enquiries." : pageType === "computer" ? "Manage computer enquiries." : "Manage all enquiries."}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          New Enquiry
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "All Enquiries", count: statusCounts.all },
          { value: "new", label: "New", count: statusCounts.new },
          { value: "contacted", label: "Contacted", count: statusCounts.contacted },
          { value: "visited", label: "Visited", count: statusCounts.visited },
          { value: "enrolled", label: "Enrolled", count: statusCounts.enrolled },
          { value: "dropped", label: "Dropped", count: statusCounts.dropped },
        ].map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={statusFilter === item.value ? "default" : "outline"}
            onClick={() => setStatusFilter(item.value as typeof statusFilter)}
          >
            {item.label} ({item.count})
          </Button>
        ))}
      </div>

      {message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Update Enquiry" : "New Enquiry"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="studentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter student name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="enquiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          onChange={(event) => {
                            field.onChange(event);
                            form.setValue("enquiryDay", dayFromDate(event.target.value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enquiryDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day</FormLabel>
                      <FormControl>
                        <Input readOnly className="bg-muted" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {activeFormType === "academic" ? (
                <div className="grid grid-cols-2 gap-4">
                  <SearchableDropdown
                    label="Class"
                    value={form.watch("className") ?? ""}
                    placeholder="Search or select class"
                    options={[
                      { label: "NURSERY", value: "NURSERY" },
                      { label: "L.K.G", value: "L.K.G" },
                      { label: "U.K.G", value: "U.K.G" },
                      ...Array.from({ length: 12 }, (_, index) => ({
                        label: String(index + 1),
                        value: String(index + 1),
                      })),
                      /*...Array.from({ length: 12 }, (_, index) => ({
                        label: `CLASS ${index + 1} - CBSE`,
                        value: `CLASS ${index + 1} - CBSE`,
                      })),
                      ...Array.from({ length: 12 }, (_, index) => ({
                        label: `CLASS ${index + 1} - ICSE`,
                        value: `CLASS ${index + 1} - ICSE`,
                      })),*/
                    ]}
                    onChange={(value) => form.setValue("className", value, { shouldValidate: true })}
                  />

                  <SearchableDropdown
                    label="Board"
                    value={form.watch("board") ?? ""}
                    placeholder="Search or select board"
                    options={[
                      { label: "CBSE", value: "CBSE" },
                      { label: "ICSE", value: "ICSE" },
                      { label: "UP Board", value: "UP Board" },
                      { label: "Other", value: "Other" },
                    ]}
                    onChange={(value) => form.setValue("board", value, { shouldValidate: true })}
                  />
                </div>
              ) : (
                <SearchableDropdown
                  label="Course"
                  value={form.watch("courseInterest") ?? ""}
                  placeholder="Search or select computer course"
                  options={computerCourseOptions}
                  onChange={(value) => form.setValue("courseInterest", value, { shouldValidate: true })}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          placeholder="Enter mobile number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <SearchableDropdown
                  label="Source"
                  value={form.watch("source")}
                  placeholder="Search or select source"
                  options={[
                    { label: "Walk In", value: "walk-in" },
                    { label: "Website", value: "website" },
                    { label: "Referral", value: "referral" },
                    { label: "Social Media", value: "social-media" },
                    { label: "Other", value: "other" },
                  ]}
                  onChange={(value) =>
                    form.setValue("source", value as EnquiryForm["source"], { shouldValidate: true })
                  }
                />
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remark</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write follow-up details or any note..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {message ? <p className="text-sm text-red-600">{message}</p> : null}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editTarget
                    ? "Update Enquiry"
                    : "Save Enquiry"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex max-w-sm items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, class, board or number..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9"
            />
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date / Day</TableHead>
                <TableHead>Class / Course</TableHead>
                <TableHead>Board</TableHead>
                <TableHead>Contact Number</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No enquiries found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((enquiry) => {
                  const { board, remark } = readRemarks(enquiry.remarks);

                  return (
                    <TableRow key={enquiry.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <UserPlus className="h-4 w-4 text-muted-foreground" />
                          {enquiry.studentName}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{displayDate((enquiry as any).enquiryDate ?? String(enquiry.createdAt ?? "").slice(0, 10))}</div>
                        <div className="text-xs text-muted-foreground">
                          {(enquiry as any).enquiryDay ?? dayFromDate((enquiry as any).enquiryDate ?? String(enquiry.createdAt ?? "").slice(0, 10))}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {((enquiry as any).enquiryType ?? "academic") === "computer"
                          ? enquiry.courseInterest || "-"
                          : (enquiry as any).className || "-"}
                      </TableCell>
                      <TableCell>
                        {((enquiry as any).enquiryType ?? "academic") === "computer" ? "-" : (enquiry as any).board || "-"}
                      </TableCell>
                      <TableCell className="text-sm">{enquiry.phone}</TableCell>
                      <TableCell className="capitalize text-sm">
                        {(enquiry.source ?? "-").replace("-", " ")}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-pre-wrap text-sm text-muted-foreground">
                        {remark || "-"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={enquiry.status}
                          onValueChange={(value) => updateStatus(enquiry.id, value)}
                        >
                          <SelectTrigger
                            className={`h-7 w-[110px] border-0 text-xs font-medium ${STATUS_COLORS[enquiry.status] ?? ""}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="visited">Visited</SelectItem>
                            <SelectItem value="enrolled">Enrolled</SelectItem>
                            <SelectItem value="dropped">Dropped</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(enquiry)}
                            title="Update enquiry"
                          >
                            <Pencil className="mr-1 h-4 w-4" />
                            Update
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteEnquiry(enquiry)}
                            disabled={deletingId === enquiry.id}
                            title="Delete enquiry"
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            {deletingId === enquiry.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

