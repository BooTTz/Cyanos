import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** 轻量受控字段：不依赖 HeroUI v3 的多层 compound API，样式与平台表单一致 */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-foreground mb-1.5 block text-xs font-medium">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="border-separator bg-field-background text-foreground placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--glow-purple)] w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all"
      />
    </label>
  );
}

/** 轻量受控下拉：options 来自字典 hook */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "请选择",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-foreground mb-1.5 block text-xs font-medium">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-separator bg-field-background text-foreground focus:border-accent focus:shadow-[0_0_0_3px_var(--glow-purple)] w-full appearance-none rounded-xl border px-3 py-2.5 pr-9 text-sm outline-none transition-all"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="text-muted pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
      </span>
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-foreground mb-1.5 block text-xs font-medium">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="border-separator bg-field-background text-foreground placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--glow-purple)] w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none transition-all"
      />
    </label>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
