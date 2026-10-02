export const BUSINESS_TYPES = [
  { value: "school", label: "School" },
  { value: "coaching", label: "Coaching / education" },
  { value: "computer_institute", label: "Computer institute" },
  { value: "tuition_center", label: "Tuition center" },
  { value: "academy", label: "Academy" },
  { value: "restaurant", label: "Restaurant" },
  { value: "gym", label: "Gym / fitness" },
  { value: "hospital", label: "Hospital" },
  { value: "clinic", label: "Clinic" },
  { value: "retail_store", label: "Retail store" },
  { value: "salon_spa", label: "Salon / spa" },
  { value: "hotel", label: "Hotel / hospitality" },
  { value: "real_estate", label: "Real estate" },
  { value: "other", label: "Other business" },
] as const;

export function isEducationBusinessType(value?: string): boolean {
  return ["school", "coaching", "computer_institute", "tuition_center", "academy"].includes(value ?? "");
}

export function businessTypeLabel(value?: string, industryLabel?: string): string {
  if (value === "other" && industryLabel?.trim()) return industryLabel.trim();
  return BUSINESS_TYPES.find((item) => item.value === value)?.label ?? value?.replaceAll("_", " ") ?? "Business";
}
