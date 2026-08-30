/** Postgres `numeric` arrives as a string. We want a JS number on the entity. */
export const numericTransformer = {
  to: (value: number): number => value,
  from: (value: string | number | null): number => {
    if (value === null) return 0;
    return typeof value === 'number' ? value : Number(value);
  },
};
