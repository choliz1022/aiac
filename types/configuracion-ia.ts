export type ConfiguracionIA = {
  id: string;
  user_id?: string;
  contrato_id?: string | null;
  estilo_redaccion: string;
  ejemplos_redaccion: string;
  instrucciones_informe: string;
  contexto_tecnico: string;
  created_at: string;
  updated_at: string;
};

export type ConfiguracionIAFormData = {
  estilo_redaccion: string;
  ejemplos_redaccion: string;
  instrucciones_informe: string;
  contexto_tecnico: string;
};

export type ConfiguracionIAContext = {
  contexto_tecnico: string;
  instrucciones_informe: string;
  estilo_redaccion: string;
  ejemplos_redaccion: string;
};
