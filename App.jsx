import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Clock, Users, MapPin, Layers, CheckCircle2, Download, ChevronRight } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const TASKS = [
  "Honing",
  "Remove joints",
  "Remove stone",
  "Remove brick backup",
  "Remove lintel",
  "Repair steel",
  "Install new lintel",
  "Install new brick backup",
  "Install numbered stone",
  "Repointing",
  "D/2 cleaning"
];

const UNITS = {
  "Honing": "stones",
  "Remove joints": "LF",
  "Remove stone": "stones",
  "Remove brick backup": "SQFT",
  "Remove lintel": "EA",
  "Repair steel": "LF",
  "Install new lintel": "EA",
  "Install new brick backup": "SQFT",
  "Install numbered stone": "stones",
  "Repointing": "LF",
  "D/2 cleaning": "SQFT"
};

const FLOORS = Array.from({ length: 98 }, (_, index) => `C${index + 18}`);
const CREW_SIZE_OPTIONS = Array.from({ length: 40 }, (_, index) => index + 1);
const HOURS_OPTIONS = Array.from({ length: 49 }, (_, index) => Number((index * 0.25).toFixed(2)));
const ELEVATIONS = ["North", "South", "East", "West"];
const ELEVATION_CODES = {
  North: "N",
  South: "S",
  East: "E",
  West: "W"
};
const MAX_STONES_PER_FLOOR_FACE = 19;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null;


function Card({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function Button({ className = "", children, ...props }) {
  return (
    <button type="button" className={className} {...props}>
      {children}
    </button>
  );
}

const inputClass = "w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-base text-zinc-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-zinc-700 focus:ring-4 focus:ring-zinc-200";
const labelClass = "text-xs font-semibold text-slate-500";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function blankLine(defaultCrewSize = 3) {
  return {
    id: crypto.randomUUID(),
    task: "Honing",
    location: "C24",
    crewSize: defaultCrewSize,
    hours: 4,
    quantity: 4,
    stoneNumbers: "",
    notes: "",
    elevation: "",
    stonePickerOpen: false
  };
}

export default function BatonRougeMasonryTrackerApp() {
  const [date, setDate] = useState(today());
  const [crewSize, setCrewSize] = useState(3);
  const [foreman, setForeman] = useState("");
  const [lines, setLines] = useState([blankLine(3)]);
  const [submitted, setSubmitted] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totals = useMemo(() => {
    const manHours = lines.reduce((sum, line) => sum + Number(crewSize || 0) * Number(line.hours || 0), 0);
    const workHours = lines.reduce((sum, line) => sum + Number(line.hours || 0), 0);
    return { manHours, workHours, entries: lines.length };
  }, [lines, crewSize]);

  const resetSubmitMessages = () => {
    setSubmitted(false);
    setSubmitStatus("");
    setSubmitError("");
  };

  const updateLine = (id, patch) => {
    setLines(current => current.map(line => (line.id === id ? { ...line, ...patch } : line)));
    resetSubmitMessages();
  };

  const addLine = () => {
    setLines(current => [...current, blankLine(crewSize)]);
    resetSubmitMessages();
  };

  const removeLine = (id) => {
    setLines(current => current.length === 1 ? current : current.filter(line => line.id !== id));
    resetSubmitMessages();
  };

  const buildRows = () => {
    const safeForeman = foreman.trim();

    return lines.map((line, index) => {
      const hours = Number(line.hours || 0);
      const quantity = Number(line.quantity || 0);
      const manHours = Number(crewSize || 0) * hours;
      const unit = UNITS[line.task] || "";
      const productionRate = manHours > 0 ? Number((quantity / manHours).toFixed(3)) : null;

      return {
        log_date: date,
        foreman: safeForeman,
        crew_size: Number(crewSize || 0),
        entry_number: index + 1,
        task: line.task,
        elevation: line.elevation || null,
        floor: line.location,
        quantity,
        unit,
        hours,
        man_hours: manHours,
        production_rate: productionRate,
        stone_numbers: line.stoneNumbers || null,
        notes: line.notes || null,
        project: "Louisiana State Capital"
      };
    });
  };

  const validateLog = () => {
    if (!supabase) {
      return "Supabase is not connected. Check your .env file locally and your Vercel environment variables online.";
    }

    if (!date) {
      return "Please select a date before submitting.";
    }

    if (!foreman.trim()) {
      return "Please enter the foreman / lead name before submitting.";
    }

    if (!Number(crewSize || 0)) {
      return "Please select a crew size before submitting.";
    }

    const invalidLine = lines.find(line =>
      !line.task ||
      !line.location ||
      Number(line.quantity || 0) < 0 ||
      Number(line.hours || 0) <= 0
    );

    if (invalidLine) {
      return "Please make sure every task has a floor, quantity, and hours greater than 0.";
    }

    return "";
  };

  const submitDailyLog = async () => {
    setSubmitStatus("");
    setSubmitError("");

    const validationError = validateLog();

    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    const rows = buildRows();

    setIsSubmitting(true);

    const { error } = await supabase
      .from("daily_logs")
      .insert(rows);

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      setSubmitError(error.message || "Daily log was not submitted. Please try again.");
      return;
    }

    setSubmitted(true);
    setSubmitStatus(`Daily log submitted: ${rows.length} entries, ${totals.manHours} man-hours.`);
  };

  const downloadCsv = () => {
    const rows = buildRows();

    const headers = [
      "log_date",
      "foreman",
      "crew_size",
      "entry_number",
      "task",
      "elevation",
      "floor",
      "quantity",
      "unit",
      "hours",
      "man_hours",
      "production_rate",
      "stone_numbers",
      "notes",
      "project"
    ];

    const escapeCsv = value => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const csv = [
      headers.join(","),
      ...rows.map(row => headers.map(header => escapeCsv(row[header])).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const safeForeman = (foreman.trim() || "foreman").replace(/[^a-z0-9]/gi, "_");
    const link = document.createElement("a");

    link.href = url;
    link.download = `Louisiana_State_Capital_${date}_${safeForeman}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-zinc-950 bg-cover bg-center bg-fixed text-zinc-950"
      style={{ backgroundImage: "url('/louisiana-state-capitol.jpg')" }}
    >
      <div className="absolute inset-0 bg-zinc-950/55" />
      <div className="relative z-10 p-4 sm:p-6">
        <div className="mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-5"
        >
          <div className="rounded-[2rem] bg-white/92 p-4 shadow-2xl ring-1 ring-white/50 backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <img
                src="/stone-lime-logo.png"
                alt="Stone & Lime Historic Restoration Services"
                className="h-12 w-auto object-contain"
              />
              <div className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-zinc-800">
                iOS-style
              </div>
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Louisiana State Capital</p>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Daily Masonry Log</h1>
            </div>
          </div>

          <Card className="rounded-3xl border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-sm">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className={labelClass}>Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={e => {
                      setDate(e.target.value);
                      resetSubmitMessages();
                    }}
                    className={inputClass}
                  />
                </label>
                <div className="space-y-1">
                  <span className={labelClass}>Crew size</span>
                  <WheelPicker
                    value={crewSize}
                    options={CREW_SIZE_OPTIONS}
                    onChange={value => {
                      setCrewSize(value);
                      resetSubmitMessages();
                    }}
                    suffix="men"
                    compact
                  />
                </div>
              </div>
              <label className="space-y-1 block">
                <span className={labelClass}>Foreman / Lead</span>
                <input
                  value={foreman}
                  onChange={e => {
                    setForeman(e.target.value);
                    resetSubmitMessages();
                  }}
                  placeholder="Name"
                  className={inputClass}
                />
              </label>
              <p className="rounded-2xl bg-zinc-100 px-3 py-3 text-sm text-zinc-700 ring-1 ring-zinc-200">
                This crew size will be used for man-hour calculations on all task entries for this daily log.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <SummaryCard icon={<Clock size={16} />} label="Hours" value={totals.workHours} />
            <SummaryCard icon={<Users size={16} />} label="Man-hours" value={totals.manHours} />
            <SummaryCard icon={<Layers size={16} />} label="Entries" value={totals.entries} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-950">Work performed</h2>
              <Button onClick={addLine} className="rounded-full bg-zinc-900 text-white shadow-sm hover:bg-zinc-800">
                <Plus size={16} className="mr-1" /> Add task
              </Button>
            </div>

            {lines.map((line, index) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Card className="rounded-3xl border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-sm">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-200">{index + 1}</div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-950">Task entry</p>
                          <p className="text-xs text-slate-500">Split hours by task</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeLine(line.id)}
                        className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove entry"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <label className="space-y-1 block">
                      <span className={labelClass}>Task</span>
                      <select
                        value={line.task}
                        onChange={e => updateLine(line.id, { task: e.target.value })}
                        className={inputClass}
                      >
                        {TASKS.map(task => <option key={task} className="bg-white text-zinc-950">{task}</option>)}
                      </select>
                    </label>

                    <div className="rounded-3xl bg-white/75 p-3 ring-1 ring-slate-200 backdrop-blur-sm">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <MapPin size={14} /> Production details
                      </div>
                      <div className="mb-3 grid grid-cols-4 gap-2">
                        {ELEVATIONS.map(elevation => {
                          const isSelected = line.elevation === elevation;
                          return (
                            <button
                              key={elevation}
                              type="button"
                              onClick={() => updateLine(line.id, { elevation: isSelected ? "" : elevation })}
                              className={`rounded-2xl px-2 py-3 text-xs font-semibold transition ${isSelected ? "bg-zinc-900 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}
                            >
                              {elevation}
                            </button>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <WheelColumn
                          label="Floor"
                          value={line.location}
                          options={FLOORS}
                          onChange={value => updateLine(line.id, { location: value })}
                        />
                        <div className="space-y-1">
                          <div className="text-center text-[11px] font-semibold text-slate-500">Qty {UNITS[line.task]}</div>
                          <input
                            type="number"
                            min="0"
                            inputMode="decimal"
                            value={line.quantity}
                            onChange={e => updateLine(line.id, { quantity: e.target.value })}
                            className="h-[114px] w-full rounded-2xl border border-slate-200 bg-white px-2 text-center text-xl font-bold text-zinc-950 shadow-inner outline-none placeholder:text-slate-400 focus:border-zinc-700 focus:ring-4 focus:ring-zinc-200"
                          />
                        </div>
                        <WheelColumn
                          label="Hours"
                          value={Number(line.hours || 0)}
                          options={HOURS_OPTIONS}
                          onChange={value => updateLine(line.id, { hours: value })}
                        />
                      </div>
                    </div>

                    {[
                      "Install numbered stone",
                      "Remove stone",
                      "Honing",
                      "Remove brick backup",
                      "Install new brick backup",
                      "D/2 cleaning"
                    ].includes(line.task) && (
                      <StoneNumberSelector line={line} updateLine={updateLine} labelClass={labelClass} />
                    )}

                    <label className="space-y-1 block">
                      <span className={labelClass}>Notes / elevation / bay</span>
                      <textarea
                        value={line.notes}
                        onChange={e => updateLine(line.id, { notes: e.target.value })}
                        placeholder="Optional"
                        rows={2}
                        className={`${inputClass} resize-none`}
                      />
                    </label>

                    <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-700 ring-1 ring-slate-200">
                      <span className="font-medium text-slate-500">Calculated:</span> {Number(crewSize || 0) * Number(line.hours || 0)} man-hours for {line.quantity || 0} {UNITS[line.task]} on {line.elevation ? `${line.elevation} ` : ""}{line.location}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="space-y-3 pb-8">
            <Card className="rounded-3xl border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-sm">
              <CardContent className="p-4 space-y-3">
                <button
                  type="button"
                  onClick={submitDailyLog}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-between rounded-2xl bg-zinc-900 px-4 py-4 font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={19} /> {isSubmitting ? "Submitting..." : "Submit daily log"}
                  </span>
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={downloadCsv}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download size={16} /> Download CSV backup
                </button>
                {submitError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-red-50 px-3 py-3 text-center text-sm font-medium text-red-700 ring-1 ring-red-100">
                    {submitError}
                  </motion.p>
                )}
                {submitted && submitStatus && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-green-50 px-3 py-3 text-center text-sm font-medium text-green-700 ring-1 ring-green-100">
                    {submitStatus}
                  </motion.p>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}

function StoneNumberSelector({ line, updateLine, labelClass }) {
  const selectedStones = line.stoneNumbers
    ? line.stoneNumbers.split(",").map(item => item.trim()).filter(Boolean)
    : [];

  const floorNumber = String(line.location || "").replace(/[^0-9]/g, "");
  const elevationCode = ELEVATION_CODES[line.elevation];
  const canBuildStoneList = Boolean(floorNumber && elevationCode);
  const stoneOptions = canBuildStoneList
    ? Array.from({ length: MAX_STONES_PER_FLOOR_FACE }, (_, index) => `C${floorNumber}-${elevationCode}${index + 1}`)
    : [];

  const toggleStone = stoneNumber => {
    const nextStones = selectedStones.includes(stoneNumber)
      ? selectedStones.filter(item => item !== stoneNumber)
      : [...selectedStones, stoneNumber];

    updateLine(line.id, { stoneNumbers: nextStones.join(", ") });
  };

  const clearStones = () => {
    updateLine(line.id, { stoneNumbers: "" });
  };

  return (
    <div className="space-y-2">
      <span className={labelClass}>Stone numbers</span>
      <button
        type="button"
        onClick={() => updateLine(line.id, { stonePickerOpen: !line.stonePickerOpen })}
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-base text-zinc-950 shadow-sm outline-none transition hover:bg-slate-50 focus:border-zinc-700 focus:ring-4 focus:ring-zinc-200"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">
              {selectedStones.length ? selectedStones.join(", ") : "Tap to select stones"}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {canBuildStoneList
                ? `${line.elevation} ${line.location} · ${selectedStones.length} selected`
                : "Select North/South/East/West and floor first"}
            </div>
          </div>
          <div className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
            {line.stonePickerOpen ? "Close" : "Open"}
          </div>
        </div>
      </button>

      {line.stonePickerOpen && (
        <div className="rounded-3xl bg-white/75 p-3 ring-1 ring-slate-200 backdrop-blur-sm">
          {!canBuildStoneList ? (
            <div className="rounded-2xl bg-amber-50 px-3 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
              Choose a building face and floor first. Example: South + C48 creates C48-S1 through C48-S19.
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-zinc-950">
                    {line.location}-{elevationCode}1 to {line.location}-{elevationCode}{MAX_STONES_PER_FLOOR_FACE}
                  </div>
                  <div className="text-xs text-slate-500">
                    Qty entered: {line.quantity || 0}. Max stones on this face/floor: {MAX_STONES_PER_FLOOR_FACE}.
                  </div>
                </div>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={clearStones}
                  className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                >
                  Clear selected
                </button>
                <button
                  type="button"
                  onClick={() => updateLine(line.id, { stonePickerOpen: false })}
                  className="rounded-2xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800"
                >
                  Done
                </button>
              </div>
              <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1">
                {stoneOptions.map(stoneNumber => {
                  const isChecked = selectedStones.includes(stoneNumber);
                  return (
                    <button
                      key={stoneNumber}
                      type="button"
                      onClick={() => toggleStone(stoneNumber)}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${isChecked ? "bg-zinc-100 ring-2 ring-zinc-700" : "bg-white ring-1 ring-slate-200 hover:bg-slate-100"}`}
                    >
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${isChecked ? "border-zinc-900 bg-zinc-900 text-white" : "border-slate-300 bg-white"}`}>
                        {isChecked ? "✓" : ""}
                      </span>
                      <span className="font-semibold text-zinc-950">{stoneNumber}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function WheelColumn({ label, value, options, onChange }) {
  return (
    <div className="space-y-1">
      <div className="text-center text-[11px] font-semibold text-slate-500">{label}</div>
      <WheelPicker value={value} options={options} onChange={onChange} compact />
    </div>
  );
}

function WheelPicker({ value, options, onChange, suffix = "", compact = false }) {
  const itemHeight = compact ? 38 : 44;
  const wheelHeight = compact ? 114 : 132;
  const padding = (wheelHeight - itemHeight) / 2;
  const scrollRef = useRef(null);
  const scrollTimer = useRef(null);
  const isProgrammaticScroll = useRef(false);

  const normalize = item => String(item);
  const selectedIndex = Math.max(0, options.findIndex(item => normalize(item) === normalize(value)));

  useEffect(() => {
    const target = scrollRef.current;
    if (!target) return;

    isProgrammaticScroll.current = true;
    target.scrollTop = selectedIndex * itemHeight;

    const timer = window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 100);

    return () => window.clearTimeout(timer);
  }, [selectedIndex, itemHeight]);

  const snapToIndex = (target, index) => {
    const safeIndex = Math.min(options.length - 1, Math.max(0, index));
    onChange(options[safeIndex]);
    target.scrollTo({ top: safeIndex * itemHeight, behavior: "smooth" });
  };

  const handleScroll = event => {
    const target = event.currentTarget;
    if (!target || isProgrammaticScroll.current) return;

    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      const index = Math.round(target.scrollTop / itemHeight);
      snapToIndex(target, index);
    }, 90);
  };

  const handleClick = index => {
    const target = scrollRef.current;
    if (!target) return;
    snapToIndex(target, index);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-white via-white/95 to-transparent" style={{ height: padding }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-white via-white/95 to-transparent" style={{ height: padding }} />
      <div className="pointer-events-none absolute left-1 right-1 top-1/2 z-10 -translate-y-1/2 rounded-xl bg-zinc-100 ring-1 ring-zinc-200" style={{ height: itemHeight }} />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative z-30 overflow-y-auto overscroll-contain px-1"
        style={{
          height: wheelHeight,
          paddingTop: padding,
          paddingBottom: padding,
          scrollbarWidth: "none",
          msOverflowStyle: "none"
        }}
      >
        {options.map((item, index) => {
          const isSelected = normalize(item) === normalize(value);
          return (
            <button
              key={`${item}-${index}`}
              type="button"
              onClick={() => handleClick(index)}
              className={`flex w-full items-center justify-center rounded-xl text-center transition ${isSelected ? "text-xl font-bold text-zinc-950" : "text-base font-semibold text-slate-400"}`}
              style={{ height: itemHeight }}
            >
              <span>{item}</span>
              {suffix && isSelected && <span className="ml-1 text-xs font-semibold text-slate-500">{suffix}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <Card className="rounded-3xl border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-sm">
      <CardContent className="p-3">
        <div className="mb-2 text-zinc-800">{icon}</div>
        <div className="text-xl font-semibold text-zinc-950">{value}</div>
        <div className="text-xs font-medium text-slate-500">{label}</div>
      </CardContent>
    </Card>
  );
}
