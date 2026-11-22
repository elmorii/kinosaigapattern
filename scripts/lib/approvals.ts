import fs from 'node:fs';
import path from 'node:path';

export interface ApprovalsData {
  approvals: Record<string, string>; // product_id -> payhip_code
}

export function loadApprovals(filePath: string): ApprovalsData {
  if (!fs.existsSync(filePath)) {
    return { approvals: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ApprovalsData;
  } catch {
    return { approvals: {} };
  }
}

export function saveApprovals(filePath: string, data: ApprovalsData) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}
