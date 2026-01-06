"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";
import { Calendar } from "lucide-react";

interface DateTimePickerProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: string;
  required?: boolean;
}

const DateTimePicker = React.forwardRef<HTMLDivElement, DateTimePickerProps>(
  ({ label, value, onChange, placeholder, className, disabled, minDate, required }, ref) => {
    const [dateValue, setDateValue] = React.useState("");
    const [timeValue, setTimeValue] = React.useState("");

    // Parse incoming ISO value
    React.useEffect(() => {
      if (value) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            // Format for date input (YYYY-MM-DD)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            setDateValue(`${year}-${month}-${day}`);

            // Format for time input (HH:MM)
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            setTimeValue(`${hours}:${minutes}`);
          }
        } catch {
          // Invalid date, ignore
        }
      }
    }, [value]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value;
      setDateValue(newDate);
      emitChange(newDate, timeValue);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value;
      setTimeValue(newTime);
      emitChange(dateValue, newTime);
    };

    const emitChange = (date: string, time: string) => {
      if (date && time && onChange) {
        const [yearS, monthS, dayS] = date.split("-");
        const [hourS, minuteS] = time.split(":");
        const year = Number(yearS);
        const monthIndex = Number(monthS) - 1;
        const day = Number(dayS);
        const hour = Number(hourS);
        const minute = Number(minuteS);

        const combined = new Date(year, monthIndex, day, hour, minute, 0, 0);
        if (!isNaN(combined.getTime())) {
          onChange(combined.toISOString());
        }
      } else if (date && onChange) {
        // If only date is set, use start of day
        const [yearS, monthS, dayS] = date.split("-");
        const year = Number(yearS);
        const monthIndex = Number(monthS) - 1;
        const day = Number(dayS);

        const dateOnly = new Date(year, monthIndex, day, 0, 0, 0, 0);
        if (!isNaN(dateOnly.getTime())) {
          onChange(dateOnly.toISOString());
        }
      }
    };

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {label && (
          <Label className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="date"
              value={dateValue}
              onChange={handleDateChange}
              min={minDate}
              disabled={disabled}
              required={required}
              className="pl-10"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            disabled={disabled}
            className="w-32"
            placeholder={placeholder || "HH:MM"}
          />
        </div>
      </div>
    );
  }
);
DateTimePicker.displayName = "DateTimePicker";

export { DateTimePicker };

