"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@muakhah/i18n";

import type { SubAdminListItem } from "@muakhah/contracts";

import { AdminRole, SUB_ADMIN_ROLES } from "@muakhah/contracts";

import { ListToolbar } from "@/components/admin/list-toolbar";

import { PasswordInput } from "@/components/auth/password-input";

import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";

import { SidebarNavIcon } from "@/components/dashboard/sidebar-nav-icons";

import { FormFieldLabel } from "@/components/forms/form-field-label";

import { IconInput } from "@/components/forms/icon-field";

import { apiRequest } from "@/lib/api-client";

import { getToken } from "@/lib/auth";

import { downloadCsv } from "@/lib/export-csv";

import { sponsorshipStatusClass } from "@/lib/sponsorship-status";

import styles from "../../dashboard.module.css";

import authStyles from "../../../auth.module.css";



type CreateForm = {

  email: string;

  password: string;

  firstName: string;

  lastName: string;

  adminRole: (typeof SUB_ADMIN_ROLES)[number];

};



type SubAdminFilters = {

  search: string;

  role: string;

  status: string;

};



type ViewMode = "team" | "add";



const EMPTY_FORM: CreateForm = {

  email: "",

  password: "",

  firstName: "",

  lastName: "",

  adminRole: AdminRole.FAMILY_MANAGER,

};



const EMPTY_FILTERS: SubAdminFilters = {

  search: "",

  role: "",

  status: "",

};



function roleBadgeClass(role: string) {

  return styles[`role-badge--${role}` as keyof typeof styles] ?? "";

}



function roleDescriptionKey(role: (typeof SUB_ADMIN_ROLES)[number]) {

  return `admin.subAdmins.roleDescriptions.${role}` as const;

}



function hasActiveFilters(filters: SubAdminFilters) {

  return Object.values(filters).some((value) => value !== "");

}



function filterSubAdmins(items: SubAdminListItem[], filters: SubAdminFilters) {

  const query = filters.search.trim().toLowerCase();

  return items.filter((item) => {

    if (filters.role && item.adminRole !== filters.role) return false;

    if (filters.status && item.status !== filters.status) return false;

    if (!query) return true;

    const haystack = `${item.firstName} ${item.lastName} ${item.email}`.toLowerCase();

    return haystack.includes(query);

  });

}



export default function AdminSubAdminsPage() {

  const { t, te } = useI18n();

  const [view, setView] = useState<ViewMode>("team");

  const [subAdmins, setSubAdmins] = useState<SubAdminListItem[]>([]);

  const [filters, setFilters] = useState<SubAdminFilters>(EMPTY_FILTERS);

  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);



  const filteredSubAdmins = useMemo(

    () => filterSubAdmins(subAdmins, filters),

    [subAdmins, filters],

  );



  const stats = useMemo(() => {

    const active = subAdmins.filter((item) => item.status === "active").length;

    return {

      total: subAdmins.length,

      active,

      suspended: subAdmins.length - active,

    };

  }, [subAdmins]);



  const loadSubAdmins = useCallback(async (opts?: { silent?: boolean }) => {

    if (opts?.silent) {

      setRefreshing(true);

    } else {

      setLoading(true);

    }

    setError(null);

    try {

      const token = getToken();

      if (!token) throw new Error(t("admin.subAdmins.loadFailed"));

      const data = await apiRequest<{ subAdmins: SubAdminListItem[] }>(

        "/admin/sub-admins",

        {},

        token,

      );

      setSubAdmins(data.subAdmins);

    } catch (err) {

      setError(err instanceof Error ? err.message : t("admin.subAdmins.loadFailed"));

    } finally {

      if (opts?.silent) {

        setRefreshing(false);

      } else {

        setLoading(false);

      }

    }

  }, [t]);



  useEffect(() => {

    void loadSubAdmins();

  }, [loadSubAdmins]);



  async function handleCreate(e: React.FormEvent) {

    e.preventDefault();

    setSaving(true);

    setError(null);

    setSuccess(null);

    try {

      const token = getToken();

      if (!token) throw new Error(t("admin.subAdmins.createFailed"));

      await apiRequest(

        "/admin/sub-admins",

        {

          method: "POST",

          body: JSON.stringify(form),

        },

        token,

      );

      setForm(EMPTY_FORM);

      setSuccess(t("admin.subAdmins.createSuccess"));

      setView("team");

      await loadSubAdmins({ silent: true });

    } catch (err) {

      setError(err instanceof Error ? err.message : t("admin.subAdmins.createFailed"));

    } finally {

      setSaving(false);

    }

  }



  async function handleStatusChange(id: string, status: "active" | "suspended") {

    setSaving(true);

    setError(null);

    setSuccess(null);

    try {

      const token = getToken();

      if (!token) throw new Error(t("admin.subAdmins.updateFailed"));

      await apiRequest(

        `/admin/sub-admins/${encodeURIComponent(id)}`,

        {

          method: "PATCH",

          body: JSON.stringify({ status }),

        },

        token,

      );

      await loadSubAdmins({ silent: true });

    } catch (err) {

      setError(err instanceof Error ? err.message : t("admin.subAdmins.updateFailed"));

    } finally {

      setSaving(false);

    }

  }



  function exportSubAdminsCsv() {

    const headers = [

      t("admin.subAdmins.name"),

      t("admin.subAdmins.email"),

      t("admin.subAdmins.role"),

      t("admin.subAdmins.status"),

    ];

    const rows = filteredSubAdmins.map((item) => [

      `${item.firstName} ${item.lastName}`,

      item.email,

      te("adminRole", item.adminRole),

      te("userStatus", item.status),

    ]);

    downloadCsv(`sub-admins-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);

  }



  return (

    <>

      <div className={styles["page-actions"]}>

        <div className={styles["page-header"]} style={{ marginBottom: 0 }}>

          <h1>{t("admin.subAdmins.title")}</h1>

          <p className={styles["page-description"]}>{t("admin.subAdmins.description")}</p>

        </div>

        {view === "team" && (

          <ListToolbar

            onRefresh={() => void loadSubAdmins({ silent: true })}

            onExport={exportSubAdminsCsv}

            refreshing={refreshing}

            exportDisabled={filteredSubAdmins.length === 0}

          />

        )}

      </div>



      {error && (

        <div className={authStyles["error-banner"]} style={{ marginBottom: "1rem" }}>

          {error}

        </div>

      )}

      {success && (

        <div className={authStyles["success-banner"]} style={{ marginBottom: "1rem" }}>

          {success}

        </div>

      )}



      <div className={`${styles["dashboard-stats"]} ${styles["dashboard-stats--cols-3"]}`}>

        <DashboardStatCard
          label={t("admin.subAdmins.totalLabel")}
          value={stats.total}
          icon="shield"
        />

        <DashboardStatCard
          label={t("admin.subAdmins.activeLabel")}
          value={stats.active}
          icon="active"
          accent
        />

        <DashboardStatCard
          label={t("admin.subAdmins.suspendedLabel")}
          value={stats.suspended}
          icon="suspended"
        />

      </div>



      <div className={styles["sub-admin-view-tabs"]} role="tablist" aria-label={t("admin.subAdmins.title")}>

        <button

          type="button"

          role="tab"

          aria-selected={view === "team"}

          className={`${styles["sub-admin-view-tab"]} ${view === "team" ? styles["sub-admin-view-tab--active"] : ""}`}

          onClick={() => setView("team")}

        >

          <SidebarNavIcon
            name="donors"
            className={styles["sub-admin-view-tab__icon"]}
          />

          {t("admin.subAdmins.viewTeam")}

        </button>

        <button

          type="button"

          role="tab"

          aria-selected={view === "add"}

          className={`${styles["sub-admin-view-tab"]} ${view === "add" ? styles["sub-admin-view-tab--active"] : ""}`}

          onClick={() => setView("add")}

        >

          <SidebarNavIcon
            name="subAdmins"
            className={styles["sub-admin-view-tab__icon"]}
          />

          {t("admin.subAdmins.viewAdd")}

        </button>

      </div>



      {view === "team" && (

        <div className={`${styles.card} ${styles["card-wide"]} ${styles["sub-admin-list-card"]}`}>
          <div className={styles["filter-bar"]}>

            <div className={`${styles["filter-field"]} ${styles["filter-field--search"]}`}>

              <label htmlFor="sub-admin-search">{t("filters.search")}</label>

              <input

                id="sub-admin-search"

                type="search"

                value={filters.search}

                placeholder={t("admin.subAdmins.searchPlaceholder")}

                onChange={(e) =>

                  setFilters((prev) => ({ ...prev, search: e.target.value }))

                }

              />

            </div>

            <div className={styles["filter-field"]}>

              <label htmlFor="sub-admin-role-filter">{t("admin.subAdmins.role")}</label>

              <select

                id="sub-admin-role-filter"

                value={filters.role}

                onChange={(e) =>

                  setFilters((prev) => ({ ...prev, role: e.target.value }))

                }

              >

                <option value="">{t("filters.all")}</option>

                {SUB_ADMIN_ROLES.map((role) => (

                  <option key={role} value={role}>

                    {te("adminRole", role)}

                  </option>

                ))}

              </select>

            </div>

            <div className={styles["filter-field"]}>

              <label htmlFor="sub-admin-status-filter">{t("filters.status")}</label>

              <select

                id="sub-admin-status-filter"

                value={filters.status}

                onChange={(e) =>

                  setFilters((prev) => ({ ...prev, status: e.target.value }))

                }

              >

                <option value="">{t("filters.all")}</option>

                <option value="active">{te("userStatus", "active")}</option>

                <option value="suspended">{te("userStatus", "suspended")}</option>

              </select>

            </div>

            {hasActiveFilters(filters) && (

              <div className={styles["filter-actions"]}>

                <button

                  type="button"

                  className={styles["btn-secondary-inline"]}

                  onClick={() => setFilters(EMPTY_FILTERS)}

                >

                  {t("filters.clear")}

                </button>

              </div>

            )}

          </div>



          {loading && !refreshing && <p>{t("common.loading")}</p>}

          {!loading && subAdmins.length === 0 && (

            <div className={styles["sub-admin-empty"]}>

              <p className={styles["empty-state"]}>{t("admin.subAdmins.empty")}</p>

              <button

                type="button"

                className={styles["btn-primary-inline"]}

                onClick={() => setView("add")}

              >

                {t("admin.subAdmins.viewAdd")}

              </button>

            </div>

          )}

          {!loading && subAdmins.length > 0 && filteredSubAdmins.length === 0 && (

            <p className={styles["empty-state"]}>{t("filters.noResults")}</p>

          )}

          {!loading && filteredSubAdmins.length > 0 && (
            <div className={styles["table-scroll"]}>
              <table className={styles["data-table"]}>
                <thead>

                  <tr>

                    <th>{t("admin.subAdmins.name")}</th>

                    <th>{t("admin.subAdmins.role")}</th>

                    <th>{t("admin.subAdmins.status")}</th>

                    <th>{t("admin.subAdmins.actions")}</th>

                  </tr>

                </thead>

                <tbody>

                  {filteredSubAdmins.map((item) => {

                    const initials =

                      `${item.firstName.charAt(0)}${item.lastName.charAt(0)}`.toUpperCase();

                    return (

                      <tr key={item.id}>

                        <td>

                          <div className={styles["sub-admin-user-cell"]}>

                            <span className={styles["sub-admin-avatar"]}>{initials}</span>

                            <div>

                              <div className={styles["sub-admin-user-cell__name"]}>

                                {item.firstName} {item.lastName}

                              </div>

                              <div className={styles["sub-admin-user-cell__email"]}>

                                {item.email}

                              </div>

                            </div>

                          </div>

                        </td>

                        <td>

                          <span

                            className={`${styles["status-badge"]} ${roleBadgeClass(item.adminRole)}`}

                          >

                            {te("adminRole", item.adminRole)}

                          </span>

                        </td>

                        <td>

                          <span

                            className={`${styles["status-badge"]} ${sponsorshipStatusClass(

                              item.status === "active" ? "active" : "cancelled",

                            )}`}

                          >

                            {te("userStatus", item.status)}

                          </span>

                        </td>

                        <td>

                          {item.status === "active" ? (

                            <button

                              type="button"

                              className={`${styles["btn-secondary-inline"]} danger`}

                              disabled={saving}

                              onClick={() => void handleStatusChange(item.id, "suspended")}

                            >

                              {t("admin.subAdmins.suspend")}

                            </button>

                          ) : (

                            <button

                              type="button"

                              className={styles["btn-primary-inline"]}

                              disabled={saving}

                              onClick={() => void handleStatusChange(item.id, "active")}

                            >

                              {t("admin.subAdmins.activate")}

                            </button>

                          )}

                        </td>

                      </tr>

                    );

                  })}

                </tbody>

              </table>

            </div>

          )}

        </div>

      )}



      {view === "add" && (

        <div className={`${styles.card} ${styles["card-wide"]} ${styles["sub-admin-create-card"]}`}>

          <h2 className={styles["section-title"]}>{t("admin.subAdmins.createTitle")}</h2>

          <p className={styles["sub-admin-form__intro"]}>{t("admin.subAdmins.createIntro")}</p>



          <form className={styles["form-grid"]} onSubmit={(e) => void handleCreate(e)}>

            <div className={styles["form-field"]}>

              <label htmlFor="sub-admin-email">

                <FormFieldLabel icon="email">{t("admin.subAdmins.email")}</FormFieldLabel>

              </label>

              <IconInput

                icon="email"

                variant="dashboard"

                id="sub-admin-email"

                type="email"

                required

                autoComplete="off"

                placeholder="admin@example.com"

                value={form.email}

                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}

              />

            </div>



            <div className={styles["form-field"]}>

              <label htmlFor="sub-admin-password">

                <FormFieldLabel icon="lock">{t("admin.subAdmins.password")}</FormFieldLabel>

              </label>

              <PasswordInput

                id="sub-admin-password"

                name="password"

                label={t("admin.subAdmins.password")}

                hideLabel

                required

                minLength={8}

                autoComplete="new-password"

                variant="dashboard"

                value={form.password}

                onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}

              />

              <span className={styles["form-hint"]}>{t("admin.subAdmins.passwordHint")}</span>

            </div>



            <div className={styles["form-field"]}>

              <label htmlFor="sub-admin-first-name">

                <FormFieldLabel icon="user">{t("admin.subAdmins.firstName")}</FormFieldLabel>

              </label>

              <IconInput

                icon="user"

                variant="dashboard"

                id="sub-admin-first-name"

                required

                value={form.firstName}

                onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}

              />

            </div>



            <div className={styles["form-field"]}>

              <label htmlFor="sub-admin-last-name">

                <FormFieldLabel icon="user">{t("admin.subAdmins.lastName")}</FormFieldLabel>

              </label>

              <IconInput

                icon="user"

                variant="dashboard"

                id="sub-admin-last-name"

                required

                value={form.lastName}

                onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}

              />

            </div>



            <div className={`${styles["form-field"]} ${styles.full}`}>

              <div className={`${styles["role-picker"]} ${styles["role-picker--grid"]}`}>

                <span className={styles["role-picker__label"]}>

                  <FormFieldLabel icon="list">{t("admin.subAdmins.role")}</FormFieldLabel>

                </span>

                {SUB_ADMIN_ROLES.map((role) => {

                  const selected = form.adminRole === role;

                  return (

                    <button

                      key={role}

                      type="button"

                      className={`${styles["role-card"]} ${selected ? styles["role-card--selected"] : ""}`}

                      onClick={() => setForm((prev) => ({ ...prev, adminRole: role }))}

                    >

                      <span className={`${styles["status-badge"]} ${roleBadgeClass(role)}`}>

                        {te("adminRole", role)}

                      </span>

                      <span className={styles["role-card__desc"]}>

                        {t(roleDescriptionKey(role))}

                      </span>

                    </button>

                  );

                })}

              </div>

            </div>



            <div className={`${styles["form-actions"]} ${styles.full}`}>

              <button

                type="button"

                className={styles["btn-secondary-inline"]}

                onClick={() => setView("team")}

                disabled={saving}

              >

                {t("common.cancel")}

              </button>

              <button type="submit" className={styles["btn-primary-inline"]} disabled={saving}>

                {saving ? t("common.saving") : t("admin.subAdmins.createButton")}

              </button>

            </div>

          </form>

        </div>

      )}

    </>

  );

}

