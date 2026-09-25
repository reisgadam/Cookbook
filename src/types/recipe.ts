export interface RecipeFrontmatter {
  title: string;
  slug: string;
  sourceImages: string[];
  tags?: string[];
  notes?: string;
}

export interface Recipe extends RecipeFrontmatter {
  body: string;
}
