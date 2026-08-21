export type AnalisisActividadResult = {
  tipo_actividad_detectada: string;
  proyecto_detectado: string;
  obligacion_detectada: string;
  puntaje_clasificacion: number;
  redaccion_ia: string;
  resumen_ia: string;
  palabras_clave: string[];
};

export type AnalizarYGuardarActividadInput = {
  fecha: string;
  actividad: string;
};

export type AnalizarYGuardarActividadSuccess = {
  success: true;
  actividad_id: string;
  proyecto_detectado: string;
  obligacion_detectada: string;
  resumen_ia: string;
};

export type EvidenciaReferenciaInput = {
  url: string;
  nombre_archivo: string;
};

export type GuardarReferenciasEvidenciasInput = {
  actividadId: string;
  evidencias: EvidenciaReferenciaInput[];
};

export type GuardarReferenciasEvidenciasSuccess = {
  success: true;
  evidencias_count: number;
};

export type GuardarReferenciasEvidenciasError = {
  success: false;
  error: string;
};

export type GuardarReferenciasEvidenciasResult =
  | GuardarReferenciasEvidenciasSuccess
  | GuardarReferenciasEvidenciasError;

export type AnalizarYGuardarActividadError = {
  success: false;
  error: string;
};

export type AnalizarYGuardarActividadResult =
  | AnalizarYGuardarActividadSuccess
  | AnalizarYGuardarActividadError;
