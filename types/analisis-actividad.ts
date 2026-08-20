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
  proyecto_detectado: string;
  obligacion_detectada: string;
  resumen_ia: string;
};

export type AnalizarYGuardarActividadError = {
  success: false;
  error: string;
};

export type AnalizarYGuardarActividadResult =
  | AnalizarYGuardarActividadSuccess
  | AnalizarYGuardarActividadError;
