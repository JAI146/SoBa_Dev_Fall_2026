import type { FamilyReceivingMethod } from "@muakhah/contracts";

export type ReceivingMethodDetailRow = {
  labelKey: string;
  value: string;
};

function pushRow(
  rows: ReceivingMethodDetailRow[],
  labelKey: string,
  value?: string,
) {
  const trimmed = value?.trim();
  if (trimmed) {
    rows.push({ labelKey, value: trimmed });
  }
}

export function getReceivingMethodDetailRows(
  method: FamilyReceivingMethod,
): ReceivingMethodDetailRow[] {
  const rows: ReceivingMethodDetailRow[] = [];

  switch (method.method) {
    case "bank_of_palestine":
      pushRow(rows, "families.receivingFields.accountHolder", method.accountHolder);
      pushRow(rows, "families.receivingFields.accountNumber", method.accountNumber);
      pushRow(rows, "families.receivingFields.branch", method.branch);
      pushRow(rows, "families.receivingFields.notes", method.notes);
      break;
    case "usdt":
      pushRow(rows, "families.receivingFields.usdtNetwork", method.usdtNetwork);
      pushRow(rows, "families.receivingFields.walletAddress", method.walletAddress);
      pushRow(rows, "families.receivingFields.notes", method.notes);
      break;
    case "iban":
      pushRow(rows, "families.receivingFields.bankName", method.bankName);
      pushRow(rows, "families.receivingFields.accountHolder", method.accountHolder);
      pushRow(rows, "families.receivingFields.iban", method.iban);
      pushRow(rows, "families.receivingFields.swiftBic", method.swiftBic);
      pushRow(rows, "families.receivingFields.country", method.country);
      pushRow(rows, "families.receivingFields.notes", method.notes);
      break;
    case "bank_transfer":
      pushRow(rows, "families.receivingFields.bankName", method.bankName);
      pushRow(rows, "families.receivingFields.accountNumber", method.accountNumber);
      pushRow(rows, "families.receivingFields.accountHolder", method.accountHolder);
      pushRow(rows, "families.receivingFields.notes", method.notes);
      break;
    case "personal_pickup":
      pushRow(
        rows,
        "families.receivingFields.receiverName",
        method.receiverName ?? method.pickupContact,
      );
      pushRow(rows, "families.receivingFields.receiverRelationship", method.receiverRelationship);
      pushRow(
        rows,
        "families.receivingFields.generalArea",
        method.generalArea ?? method.pickupLocation,
      );
      pushRow(rows, "families.receivingFields.notes", method.notes);
      break;
    case "digital_wallet":
      pushRow(rows, "families.receivingFields.walletProvider", method.walletProvider);
      pushRow(rows, "families.receivingFields.walletId", method.walletId);
      pushRow(rows, "families.receivingFields.notes", method.notes);
      break;
    case "other":
      pushRow(rows, "families.receivingFields.methodName", method.methodName);
      pushRow(rows, "families.receivingFields.methodDescription", method.methodDescription);
      pushRow(
        rows,
        "families.receivingFields.receivingDetails",
        method.receivingDetails ?? method.otherDescription,
      );
      pushRow(rows, "families.receivingFields.notes", method.notes);
      break;
  }

  return rows;
}

export function formatReceivingMethodsSummary(
  methods: FamilyReceivingMethod[],
  t: (key: string) => string,
): string {
  return methods
    .map((method) => {
      const title = t(`families.receivingMethods.${method.method}`);
      const rows = getReceivingMethodDetailRows(method);
      if (rows.length === 0) {
        return title;
      }
      const details = rows
        .map((row) => `${t(row.labelKey)}: ${row.value}`)
        .join("\n");
      return `${title}\n${details}`;
    })
    .join("\n\n");
}
