import { useEffect, useState } from "react";
import type { RoleTotals } from "@/types/analytics";
import { getUsersSummary } from "@/app/api/admin/analytics/client";

export function useUsersSummary() {
  const [roleTotals, setRoleTotals] = useState<RoleTotals>({
    all: 0, customer: 0, staff: 0, admin: 0,
  });

  useEffect(() => {
    (async () => {
      const data = await getUsersSummary();
      setRoleTotals(data);
    })();
  }, []);

  return roleTotals;
}
