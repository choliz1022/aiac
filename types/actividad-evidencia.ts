export type ActividadEvidencia = {
  id: string;
  actividad_id: string;
  url: string;
  nombre_archivo: string;
  created_at: string;
};

export type ActividadEvidenciaInsert = {
  actividad_id: string;
  url: string;
  nombre_archivo: string;
};

export type ActividadEvidenciaConSignedUrl = ActividadEvidencia & {
  signed_url: string;
};

export type EvidenciasPorActividad = Record<string, ActividadEvidencia[]>;
