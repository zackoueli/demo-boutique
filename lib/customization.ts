import type { CustomizationField } from "./types";

/* ─── Helpers parsing "NomOption" ou "NomOption:prix€" ─── */
export function optionLabel(opt: string): string {
  return opt.split(":")[0].trim();
}

export function optionExtra(opt: string): number {
  const parts = opt.split(":");
  if (parts.length < 2) return 0;
  return Math.round(parseFloat(parts[1].trim()) * 100) || 0; // euros → centimes
}

/* ─── Calcul du supplément total de personnalisation ─── */
export function calcExtra(fields: CustomizationField[], customization: Record<string, string>): number {
  let total = 0;
  for (const field of fields) {
    const val = customization[field.id];
    if (!val) continue;
    if (field.type === "text") {
      total += field.extraPrice ?? 0;
    } else {
      const matchOpt = field.options?.find((o) => optionLabel(o) === val);
      if (matchOpt) total += optionExtra(matchOpt);
    }
  }
  return total;
}

/** Un produit dont au moins un champ est obligatoire ne peut pas être ajouté sans passer par sa fiche */
export function hasRequiredCustomization(fields?: CustomizationField[]): boolean {
  return (fields ?? []).some((f) => f.required);
}
