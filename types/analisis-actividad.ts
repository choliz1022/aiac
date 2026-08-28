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

export type AnalizarActividadPreviewInput = {
  actividad: string;
};

export type AnalizarActividadPreviewSuccess = {
  success: true;
  analisis: AnalisisActividadResult;
};

export type AnalizarActividadPreviewError = {
  success: false;
  error: string;
};

export type AnalizarActividadPreviewResult =
  | AnalizarActividadPreviewSuccess
  | AnalizarActividadPreviewError;

export type ReanalizarRedaccionActividadInput = {
  actividad: string;
  analisis: AnalisisActividadResult;
};

export type ReanalizarRedaccionActividadSuccess = {
  success: true;
  analisis: AnalisisActividadResult;
};

export type ReanalizarRedaccionActividadError = {
  success: false;
  error: string;
};

export type ReanalizarRedaccionActividadResult =
  | ReanalizarRedaccionActividadSuccess
  | ReanalizarRedaccionActividadError;

export type GuardarActividadConfirmadaInput = {
  fecha: string;
  actividad: string;
  analisis: AnalisisActividadResult;
};

export type GuardarActividadConfirmadaSuccess = {
  success: true;
  actividad_id: string;
};

export type GuardarActividadConfirmadaError = {
  success: false;
  error: string;
};

export type GuardarActividadConfirmadaResult =
  | GuardarActividadConfirmadaSuccess
  | GuardarActividadConfirmadaError;
