import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export type DropdownOption = {
  label: string;
  value: string;
};

export function SearchableDropdown({
  label,
  value,
  options,
  placeholder,
  emptyMessage = "No matching option found.",
  onChange,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  placeholder: string;
  emptyMessage?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "";

  useEffect(() => {
    if (!open) {
      setSearchText(selectedLabel);
    }
  }, [selectedLabel, open]);

  const filteredOptions = options.filter((option) =>
    option.label
      .toLowerCase()
      .includes(searchText.trim().toLowerCase())
  );

  const selectOption = (option: DropdownOption) => {
    onChange(option.value);
    setSearchText(option.label);
    setActiveIndex(-1);
    setOpen(false);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);

      setActiveIndex((old) =>
        filteredOptions.length === 0
          ? -1
          : Math.min(old + 1, filteredOptions.length - 1)
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);

      setActiveIndex((old) =>
        filteredOptions.length === 0
          ? -1
          : Math.max(old - 1, 0)
      );

      return;
    }

    if (event.key === "Enter") {
      if (open && filteredOptions.length > 0) {
        event.preventDefault();

        selectOption(
          filteredOptions[activeIndex >= 0 ? activeIndex : 0]
        );
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
        autoComplete="off"
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

      {open && (
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
                  index === activeIndex
                    ? "bg-muted font-medium"
                    : "hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}