// Figma Code Connect — status: COMPLETE
// Mapped to the "FilterSearch" component in the ui-react Figma file.
// Props: hasTenants (bool), hasFilters (bool), ListActions (slot).
import * as React from 'react';
import figma from '@figma/code-connect';

import { FilterSearch, FilterSearchActions } from './filter-search';
import { InputSearch as Search } from '../input-search/input-search';
import { ButtonMenu } from '../button-menu/button-menu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../select/select';

figma.connect(
  FilterSearch,
  'https://www.figma.com/design/lrU3ydIyvPYQNE6ixdsKtJ/ui-react?node-id=3897-7681',
  {
    props: {
      hasTenants: figma.boolean('hasTenants'),
      hasFilters: figma.boolean('hasFilters'),
      actions: figma.children('ListActions'),
    },
    example: ({ hasTenants, hasFilters, actions }: { hasTenants: boolean; hasFilters: boolean; actions: React.ReactNode }) => (
      <FilterSearch>
        {hasTenants && (
          <Select defaultValue="all">
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Search placeholder="Placeholder" aria-label="Search" className="w-56" />
        {hasFilters && <ButtonMenu variant="secondary">Table filters</ButtonMenu>}
        {actions && <FilterSearchActions>{actions}</FilterSearchActions>}
      </FilterSearch>
    ),
  }
);
