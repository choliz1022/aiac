export type Contrato = {
  id: string;
  user_id?: string;
  nombre: string;
  entidad: string;
  objeto_contractual: string;
  obligaciones: string;
  contratista_nombre?: string;
  contrato_fecha_inicio?: string | null;
  contrato_fecha_fin?: string | null;
  supervisor_nombre?: string;
  supervisor_cargo?: string;
};

export type ContratoFormData = Omit<Contrato, "id">;
