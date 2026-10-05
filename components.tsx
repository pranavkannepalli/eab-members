import { TypeCfg } from "@/lib/schema";
import { Rec } from "@/lib/db";

export function RecordForm({ cfg, rec, action }: { cfg: TypeCfg; rec?: Rec; action: (fd: FormData) => Promise<void> }) {
  return (
    <form action={action} className="card form">
      <label>Name<input name="name" defaultValue={rec?.name} required /></label>
      <label>Status<select name="status" defaultValue={rec?.status || cfg.statuses[0]}>{cfg.statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
      {cfg.fields.map((f) => (
        <label key={f.key}>{f.label}
          {f.kind === "select" ? (
            <select name={f.key} defaultValue={rec?.data[f.key] || ""}><option value=""></option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
          ) : f.kind === "textarea" ? (
            <textarea name={f.key} rows={3} defaultValue={rec?.data[f.key] || ""} />
          ) : (
            <input name={f.key} type={f.kind === "date" ? "date" : f.kind === "email" ? "email" : "text"} defaultValue={rec?.data[f.key] || ""} />
          )}
        </label>
      ))}
      <label className="wide">Notes<textarea name="notes" rows={5} defaultValue={rec?.notes} /></label>
      <div className="wide"><button className="btn">{rec ? "Save changes" : "Add"}</button></div>
    </form>
  );
}
