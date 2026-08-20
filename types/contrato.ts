export type Contrato = {
  id: string;
  user_id?: string;
  nombre: string;
  entidad: string;
  objeto_contractual: string;
  obligaciones: string;
};

export type ContratoFormData = Omit<Contrato, "id">;
