import RefreshIcon from "@mui/icons-material/Refresh";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import {
  DataGrid,
  gridClasses,
  type GridColDef,
  type GridRowModel,
} from "@mui/x-data-grid";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import PageContainer from "../../components/PageContainer";
import {
  getIndexedDbTableNames,
  getIndexedDbTableRows,
  type IndexedDbRow,
  updateIndexedDbTableRow,
} from "../../db";

const INITIAL_PAGE_SIZE = 10;

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getColumnType(value: unknown): GridColDef["type"] {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

export default function EmployeeList() {
  const [searchParams] = useSearchParams();
  const tableName =
    searchParams.get("table") ?? getIndexedDbTableNames()[0] ?? "";
  const [rows, setRows] = React.useState<IndexedDbRow[]>([]);
  const [primaryKey, setPrimaryKey] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const loadData = React.useCallback(async () => {
    if (!tableName) return;

    setIsLoading(true);
    setError(null);

    try {
      const tableData = await getIndexedDbTableRows(tableName);
      setRows(tableData.rows);
      setPrimaryKey(
        typeof tableData.primaryKey === "string" ? tableData.primaryKey : null,
      );
    } catch (loadError) {
      setError(loadError as Error);
    } finally {
      setIsLoading(false);
    }
  }, [tableName]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const fields = React.useMemo(() => {
    const fieldNames = new Set<string>();
    rows.forEach((row) =>
      Object.keys(row).forEach((field) => fieldNames.add(field)),
    );
    return Array.from(fieldNames);
  }, [rows]);

  const columns = React.useMemo<GridColDef[]>(
    () =>
      fields.map((field) => {
        const sampleValue = rows.find((row) => row[field] !== undefined)?.[
          field
        ];

        return {
          field,
          headerName: field,
          type: getColumnType(sampleValue),
          editable: field !== primaryKey,
          flex: 1,
          minWidth: 140,
          renderCell: ({ value }) => formatCellValue(value),
        };
      }),
    [fields, primaryKey, rows],
  );

  const handleRowUpdate = React.useCallback(
    async (updatedRow: GridRowModel) => {
      const row = updatedRow as IndexedDbRow;
      await updateIndexedDbTableRow(tableName, row);
      setRows((currentRows) =>
        currentRows.map((currentRow) =>
          currentRow === row ||
          currentRow[primaryKey ?? ""] === row[primaryKey ?? ""]
            ? row
            : currentRow,
        ),
      );
      return row;
    },
    [primaryKey, tableName],
  );

  return (
    <PageContainer
      title={tableName || "Library"}
      breadcrumbs={[{ title: tableName || "Library", path: "/library" }]}
      actions={
        <Tooltip title="Reload data" placement="right" enterDelay={1000}>
          <span>
            <IconButton
              size="small"
              aria-label="refresh"
              onClick={loadData}
              disabled={isLoading}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      <Box sx={{ flex: 1, width: "100%" }}>
        {error ? (
          <Alert severity="error">{error.message}</Alert>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row[primaryKey ?? ""] as string | number}
            loading={isLoading}
            editMode="row"
            processRowUpdate={handleRowUpdate}
            initialState={{
              pagination: { paginationModel: { pageSize: INITIAL_PAGE_SIZE } },
            }}
            pageSizeOptions={[5, INITIAL_PAGE_SIZE, 25]}
            showToolbar
            disableRowSelectionOnClick
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: "transparent",
              },
              [`& .${gridClasses.columnHeader}:focus-within, & .${gridClasses.cell}:focus-within`]:
                {
                  outline: "none",
                },
            }}
            slotProps={{
              loadingOverlay: {
                variant: "circular-progress",
                noRowsVariant: "circular-progress",
              },
              baseIconButton: { size: "small" },
            }}
          />
        )}
      </Box>
    </PageContainer>
  );
}
