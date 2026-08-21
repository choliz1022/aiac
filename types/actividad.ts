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
  evidencias_count?: number;
};

export type EliminarActividadSuccess = {
  success: true;
  archivos_eliminados: number;
};

export type EliminarActividadError = {
  success: false;
  error: string;
};

export type EliminarActividadResult = EliminarActividadSuccess | EliminarActividadError;

export type ActualizarActividadSuccess = {
  success: true;
  actividad: {
    id: string;
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
};

export type ActualizarActividadError = {
  success: false;
  error: string;
};

export type ActualizarActividadResult =
  | ActualizarActividadSuccess
  | ActualizarActividadError;

export type GuardarEvidenciasActividadSuccess = {
  success: true;
  evidencias_agregadas: number;
};

export type GuardarEvidenciasActividadError = {
  success: false;
  error: string;
};

export type GuardarEvidenciasActividadResult =
  | GuardarEvidenciasActividadSuccess
  | GuardarEvidenciasActividadError;

export type EliminarEvidenciaActividadSuccess = {
  success: true;
};

export type EliminarEvidenciaActividadError = {
  success: false;
  error: string;
};

export type EliminarEvidenciaActividadResult =
  | EliminarEvidenciaActividadSuccess
  | EliminarEvidenciaActividadError;
