export type Contrato = {
  id: string;
  user_id?: string;
  nombre: string;
  entidad: string;
  alias?: string;
  estado?: string;
  objeto_contractual: string;
  obligaciones: string;
  contratista_nombre?: string;
  contrato_fecha_inicio?: string | null;
  contrato_fecha_fin?: string | null;
  supervisor_nombre?: string;
  supervisor_cargo?: string;
  created_at?: string;
};

export type ContratoFormData = Omit<Contrato, "id" | "user_id" | "estado" | "created_at">;
