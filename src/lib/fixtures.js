// Hand-kept JS mirror of scripts/fixtures.py, used to render the small sample
// tables cards visually operate on. Only tabular/array fixtures live here —
// values must stay in sync with fixtures.py, but there's no runtime link
// between the two (Python isn't shipped in the app).
//
// `null` marks a missing value (NaN/None). csv fixtures use the literal
// string '?' instead, since that's what actually sits in the raw file before
// na_values parsing — showing it as text (not "missing") is the point of
// those cards.

const df = {
  kind: 'table',
  columns: ['region', 'category', 'revenue', 'units'],
  rows: [
    ['West', 'Shoes', 120, 12],
    ['East', 'Shoes', 95, 9],
    ['West', 'Bags', 80, 8],
    ['East', 'Bags', 60, 6],
    ['West', 'Bags', 45, 5],
    ['East', 'Shoes', 70, 7],
    ['North', 'Shoes', 50, 5],
    ['North', 'Bags', 65, 6],
  ],
};

const region_managers = {
  kind: 'table',
  columns: ['region', 'manager'],
  rows: [
    ['West', 'Priya'],
    ['East', 'Omar'],
    ['South', 'Lena'],
  ],
};

const region_targets = {
  kind: 'table',
  columns: ['area', 'target'],
  rows: [
    ['West', 200],
    ['East', 150],
    ['North', 100],
  ],
};

const arr = {
  kind: 'array',
  values: [10, 20, 30, 40, 50],
};

const sales_gaps = {
  kind: 'table',
  columns: ['region', 'category', 'revenue', 'units'],
  rows: [
    ['West', 'Shoes', 120, 12],
    ['East', 'Shoes', null, 9],
    ['West', 'Bags', 80, 8],
    ['East', 'Bags', 60, 6],
    ['West', null, 45, null],
    ['East', 'Shoes', null, 7],
    ['North', 'Shoes', 50, null],
    ['North', 'Bags', 65, 6],
  ],
};

const regional_sales = {
  kind: 'table',
  columns: ['region', 'category', 'revenue', 'units'],
  rows: [
    ['West', 'Shoes', 120, 12],
    ['West', 'Bags', 80, 8],
    ['East', 'Shoes', 95, 9],
    ['East', 'Bags', 60, 6],
    ['North', 'Shoes', 50, 5],
  ],
};

const ts = {
  kind: 'table',
  columns: ['date', 'revenue'],
  rows: [
    ['2024-01-01', 120],
    ['2024-01-02', 95],
    ['2024-01-03', 80],
    ['2024-01-04', 60],
    ['2024-01-05', 45],
    ['2024-01-06', 70],
    ['2024-01-07', 50],
    ['2024-01-08', 65],
    ['2024-01-09', 90],
    ['2024-01-10', 110],
    ['2024-01-11', 75],
    ['2024-01-12', 55],
    ['2024-01-13', 85],
    ['2024-01-14', 100],
  ],
};

const csv_path = {
  kind: 'table',
  columns: ['order_date', 'region', 'category', 'revenue', 'units'],
  rows: [
    ['2024-01-05', 'West', 'Shoes', 120, 12],
    ['2024-01-06', 'East', 'Shoes', 95, 9],
    ['2024-01-07', 'West', 'Bags', 80, 8],
    ['2024-01-08', 'East', 'Bags', 60, 6],
    ['2024-01-09', 'West', 'Bags', 45, 5],
    ['2024-01-10', 'East', 'Shoes', 70, 7],
    ['2024-01-11', 'North', 'Shoes', 50, 5],
    ['2024-01-12', 'North', 'Bags', 65, 6],
  ],
};

const csv_path_no_header = {
  kind: 'table',
  columns: ['0', '1', '2', '3', '4'],
  rows: csv_path.rows,
};

const csv_path_missing = {
  kind: 'table',
  columns: ['order_date', 'region', 'category', 'revenue', 'units'],
  rows: [
    ['2024-01-05', 'West', 'Shoes', 120, 12],
    ['2024-01-06', 'East', 'Shoes', '?', 9],
    ['2024-01-07', 'West', 'Bags', 80, 8],
    ['2024-01-08', 'East', 'Bags', 60, 6],
    ['2024-01-09', 'West', 'Bags', 45, '?'],
    ['2024-01-10', 'East', 'Shoes', 70, 7],
    ['2024-01-11', 'North', 'Shoes', 50, 5],
    ['2024-01-12', 'North', 'Bags', 65, 6],
  ],
};

export const FIXTURES = {
  df,
  region_managers,
  region_targets,
  arr,
  sales_gaps,
  regional_sales,
  ts,
  csv_path,
  csv_path_no_header,
  csv_path_missing,
};

export function getFixture(name) {
  return FIXTURES[name];
}
