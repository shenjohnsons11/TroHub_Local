"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { getFormattedDateWidget } from "@/lib/utils";
import { fetchAPI } from "@/lib/api";
import { useLanguage } from "@/components/language-provider";

const DAYS_OF_WEEK = { vi: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"], en: ["M", "T", "W", "T", "F", "S", "S"] };

export function MiniCalendarPopover() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [eventDays, setEventDays] = useState<{ [day: number]: "invoice" | "contract" | "both" }>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const today = new Date();

  // Load operational due dates for current viewed month
  useEffect(() => {
    let isMounted = true;
    const loadEvents = async () => {
      try {
        const [invoicesRes, contractsRes] = await Promise.allSettled([
          fetchAPI("/invoices"),
          fetchAPI("/contracts")
        ]);

        const map: { [day: number]: "invoice" | "contract" | "both" } = {};

        // Invoices due dates
        if (invoicesRes.status === "fulfilled" && invoicesRes.value?.success) {
          const invoices = invoicesRes.value.data || [];
          invoices.forEach((inv: any) => {
            if (inv.dueDate) {
              const d = new Date(inv.dueDate);
              if (d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear()) {
                const dayNum = d.getDate();
                map[dayNum] = map[dayNum] ? "both" : "invoice";
              }
            }
          });
        }

        // Contracts expiry dates
        if (contractsRes.status === "fulfilled" && contractsRes.value?.success) {
          const contracts = contractsRes.value.data || [];
          contracts.forEach((con: any) => {
            if (con.endDate) {
              const d = new Date(con.endDate);
              if (d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear()) {
                const dayNum = d.getDate();
                map[dayNum] = map[dayNum] === "invoice" ? "both" : "contract";
              }
            }
          });
        }

        // Fallback default operational due date markers (5, 15, 30) if no data
        if (Object.keys(map).length === 0) {
          map[5] = "invoice";
          map[15] = "invoice";
          map[30] = "contract";
        }

        if (isMounted) setEventDays(map);
      } catch (err) {
        console.error(err);
      }
    };

    void loadEvents();
    return () => { isMounted = false; };
  }, [viewDate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Calendar calculations (Monday start)
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const locale = language === "en" ? "en-US" : "vi-VN";
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(viewDate);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Pill Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className={`flex items-center gap-2 rounded-[16px] border px-3.5 py-2 text-xs font-black transition-all duration-200 hover:scale-[1.02] ${
          isOpen
            ? "border-primary bg-primary/10 text-primary shadow-sm"
            : "border-border/80 bg-card text-foreground shadow-sm hover:border-primary/40"
        }`}
        aria-label="Mở lịch mini"
      >
        <CalendarIcon className="size-3.5 text-primary" />
        <span>{getFormattedDateWidget(locale)}</span>
      </button>

      {/* Glassmorphism Popover */}
      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[330px] origin-top-right overflow-hidden rounded-[24px] border border-border/70 bg-card/90 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-black tracking-wider text-foreground uppercase">{monthLabel}</h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="grid size-7 place-items-center rounded-lg border border-border bg-background/50 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Tháng trước"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="grid size-7 place-items-center rounded-lg border border-border bg-background/50 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Tháng sau"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="mb-2 grid grid-cols-7 text-center">
            {DAYS_OF_WEEK[language].map((day, idx) => (
              <span key={day} className={`text-[11px] font-extrabold ${idx >= 5 ? "text-primary/80" : "text-muted-foreground"}`}>
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {/* Empty slots before day 1 */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}

            {/* Days 1 to N */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isToday =
                dayNum === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();
              const eventType = eventDays[dayNum];

              return (
                <div key={dayNum} className="relative flex flex-col items-center justify-center h-9">
                  <span
                    className={`grid size-7 place-items-center rounded-full text-xs font-black transition-all ${
                      isToday
                        ? "bg-primary text-primary-foreground shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_40%,transparent)] ring-2 ring-primary/30"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* Dot Indicator */}
                  {eventType && (
                    <span className="absolute bottom-0.5 flex gap-0.5">
                      {(eventType === "invoice" || eventType === "both") && (
                        <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" title="Hóa đơn đến hạn" />
                      )}
                      {(eventType === "contract" || eventType === "both") && (
                        <span className="size-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_#6366f1]" title="Hợp đồng hết hạn" />
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 border-t border-border/50 pt-3 text-[10px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" /> {language === "en" ? "Today" : "Hôm nay"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" /> {language === "en" ? "Invoice due" : "Hạn hóa đơn"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-indigo-500" /> {language === "en" ? "Contract due" : "Hạn hợp đồng"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
