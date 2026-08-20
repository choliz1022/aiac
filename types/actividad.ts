export type ActividadInsert = {
  contrato_id: string;
  fecha: string;
  actividad_original: string;
  tipo_actividad_detectada: string;
  proyecto_detectado: string;
  obligacion_detectada: string;
  clasificacion_manual: boolean;
  puntaje_clasificacion: number;
  redaccion_ia: string;
  resumen_ia: string;
  palabras_clave: string[];
};

export type Actividad = {
  id: string;
  user_id?: string;
  contrato_id: string;
  fecha: string;
  actividad_original: string;
  tipo_actividad_detectada: string;
  proyecto_detectado: string;
  obligacion_detectada: string;
  clasificacion_manual: boolean;
  puntaje_clasificacion: number;
  redaccion_ia: string;
  resumen_ia: string;
  palabras_clave: string[];
  created_at: string;
};
