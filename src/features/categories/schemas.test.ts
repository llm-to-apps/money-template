import { describe, expect, it } from 'vitest';

import {
  parseCreateCategoryInput,
  parseListCategoriesInput,
  parseUpdateCategoryInput
} from './schemas';

describe('category schemas', () => {
  it('parses category create input', () => {
    expect(
      parseCreateCategoryInput({
        color: ' #111111 ',
        name: 'Car / Fuel',
        parentId: 'none',
        scope: 'EXPENSE'
      })
    ).toEqual({
      color: '#111111',
      name: 'Car / Fuel',
      parentId: null,
      scope: 'EXPENSE'
    });
  });

  it('parses list filters', () => {
    expect(
      parseListCategoriesInput({ includeArchived: true, query: ' car ' })
    ).toMatchObject({
      includeArchived: true,
      query: 'car'
    });
  });

  it('rejects self-parent updates', () => {
    expect(() =>
      parseUpdateCategoryInput({ id: 'cat_1', parentId: 'cat_1' })
    ).toThrow('category cannot be its own parent');
  });
});
