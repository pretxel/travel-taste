export interface CloudinaryResource {
  public_id: string;
  width: number;
  height: number;
  created_at: string;
  folder: string;
}

export interface Photo {
  publicId: string;
  width: number;
  height: number;
  folder: string;
}

export interface PhotoSection {
  slug: string;
  title: string;
  photos: Photo[];
}
