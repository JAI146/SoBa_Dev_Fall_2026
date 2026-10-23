"use client";

import {
  AdminRole,
  adminPermissionValues,
  adminRolePermissionProfilesResponseSchema,
  adminStaffResponseSchema,
  adminUsersResponseSchema,
  type AdminPermissionValue,
  type AdminRoleValue,
  type AdminRolePermissionProfile,
  type AdminUserListItem,
  type AdminStaffListItem,
} from "@purposemint/contracts";
import { type FormEvent, useState } from "react";
import { ConfirmModal } from "@/components/common/confirm-modal";
import { Dialog } from "@/components/common/dialog";
import { TrashIcon } from "@/components/common/table-action-icons";
import {
  DashboardError,
  DashboardLoading,
} from "@/components/dashboard/dashboard-data-state";
import { formatAdminDate, formatEnum } from "@/lib/admin-format";
import { useAdminQuery } from "@/lib/use-admin-query";
import { apiRequest } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { PlusIcon, SearchIcon } from "@/components/dashboard/action-icons";
import styles from "../dashboard.module.css";

const roleLabels: Record<AdminRoleValue, string> = {
  [AdminRole.SUPER_ADMIN]: "Super Admin",
  [AdminRole.MANAGER]: "Manager",
  [AdminRole.AUDITOR]: "Auditor",
  [AdminRole.EDITOR]: "Editor",
  [AdminRole.SUPPORT]: "Support",
};

const roleOrder: AdminRoleValue[] = [
  AdminRole.SUPER_ADMIN,
  AdminRole.MANAGER,
  AdminRole.AUDITOR,
  AdminRole.EDITOR,
  AdminRole.SUPPORT,
];

function formatPermission(permission: string) {
  return permission
    .split(".")
    .map((part) => part.replaceAll("_", " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" · ");
}

type EditableUser =
  | {
      kind: "staff";
      user: AdminStaffListItem;
    }
  | {
      kind: "customer";
      user: AdminUserListItem;
      roleKey: string;
      permissions: AdminPermissionValue[];
    };

export default function ManageRolesPage() {
  const query = useAdminQuery(
    "/admin/staff?page=1&pageSize=100",
    adminStaffResponseSchema,
  );
  const customersQuery = useAdminQuery(
    "/admin/users?page=1&pageSize=100",
    adminUsersResponseSchema,
  );
  const roleProfilesQuery = useAdminQuery(
    "/admin/role-permissions",
    adminRolePermissionProfilesResponseSchema,
  );
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [roleListMessage, setRoleListMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<AdminRolePermissionProfile | null>(null);
  const [roleDeleting, setRoleDeleting] = useState(false);
  const [editingRole, setEditingRole] =
    useState<AdminRolePermissionProfile | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<
    AdminPermissionValue[]
  >([]);
  const [permissionSaveMessage, setPermissionSaveMessage] = useState<
    string | null
  >(null);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<EditableUser | null>(null);
  const [editingUserPermissions, setEditingUserPermissions] = useState<
    AdminPermissionValue[]
  >([]);
  const [userPermissionMessage, setUserPermissionMessage] = useState<
    string | null
  >(null);
  const [userPermissionSaving, setUserPermissionSaving] = useState(false);
  const [editingUserRoleKey, setEditingUserRoleKey] = useState("");
  const [customerPreviews, setCustomerPreviews] = useState<
    Record<string, { roleKey: string; permissions: AdminPermissionValue[] }>
  >({});
  const [userSearch, setUserSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState<
    "all" | "staff" | "customer"
  >("all");
  const [userRoleFilter, setUserRoleFilter] = useState("");

  async function createCustomRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoleSaving(true);
    setRoleMessage(null);
    try {
      await apiRequest(
        "/admin/roles",
        {
          method: "POST",
          body: JSON.stringify({
            name: roleName,
            description: roleDescription,
            permissions: selectedPermissions,
          }),
        },
        getToken(),
      );
      setRoleName("");
      setRoleDescription("");
      setSelectedPermissions([]);
      setRoleMessage(null);
      setCreateRoleOpen(false);
      setRoleListMessage("Custom role created.");
      await roleProfilesQuery.reload();
    } catch (cause) {
      setRoleMessage(
        cause instanceof Error
          ? cause.message
          : "The role could not be created.",
      );
    } finally {
      setRoleSaving(false);
    }
  }

  function openPermissionEditor(role: AdminRolePermissionProfile) {
    setEditingRole(role);
    setEditingPermissions([...role.permissions]);
    setPermissionSaveMessage(null);
  }

  async function saveRolePermissions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRole) return;
    setPermissionSaving(true);
    setPermissionSaveMessage(null);
    try {
      await apiRequest(
        `/admin/role-permissions/${encodeURIComponent(editingRole.key)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ permissions: editingPermissions }),
        },
        getToken(),
      );
      await roleProfilesQuery.reload();
      setEditingRole(null);
    } catch (cause) {
      setPermissionSaveMessage(
        cause instanceof Error
          ? cause.message
          : "Permissions could not be saved.",
      );
    } finally {
      setPermissionSaving(false);
    }
  }

  async function deleteCustomRole() {
    if (!deleteTarget || roleDeleting) return;
    setRoleDeleting(true);
    setRoleListMessage(null);
    try {
      const roleId = deleteTarget.key.slice("custom:".length);
      await apiRequest(
        `/admin/roles/${encodeURIComponent(roleId)}`,
        { method: "DELETE" },
        getToken(),
      );
      setDeleteTarget(null);
      setRoleListMessage("Custom role deleted.");
      await roleProfilesQuery.reload();
    } catch (cause) {
      setDeleteTarget(null);
      setRoleListMessage(
        cause instanceof Error
          ? cause.message
          : "The role could not be deleted.",
      );
    } finally {
      setRoleDeleting(false);
    }
  }

  function roleDefaultPermissions(roleKey: string) {
    return roleProfiles.find((role) => role.key === roleKey)?.permissions ?? [];
  }

  function openUserPermissionEditor(user: EditableUser) {
    setEditingUser(user);
    setEditingUserRoleKey(
      user.kind === "staff" ? user.user.roleKey : user.roleKey,
    );
    setEditingUserPermissions(
      user.kind === "staff"
        ? [...user.user.permissions]
        : [...user.permissions],
    );
    setUserPermissionMessage(null);
  }

  function changeEditingUserRole(roleKey: string) {
    setEditingUserRoleKey(roleKey);
    setEditingUserPermissions([...roleDefaultPermissions(roleKey)]);
  }

  async function saveUserPermissions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    setUserPermissionSaving(true);
    setUserPermissionMessage(null);
    try {
      if (editingUser.kind === "customer") {
        setCustomerPreviews((current) => ({
          ...current,
          [editingUser.user.id]: {
            roleKey: editingUserRoleKey,
            permissions: [...editingUserPermissions],
          },
        }));
        setEditingUser(null);
        return;
      }
      const userPath = `/admin/staff/${encodeURIComponent(editingUser.user.id)}`;
      const roleChanged = editingUserRoleKey !== editingUser.user.roleKey;
      const defaults = roleDefaultPermissions(editingUserRoleKey);
      const matchesRole =
        editingUserPermissions.length === defaults.length &&
        editingUserPermissions.every((permission) =>
          defaults.includes(permission),
        );
      if (roleChanged) {
        await apiRequest(
          `${userPath}/role`,
          {
            method: "PATCH",
            body: JSON.stringify({ roleKey: editingUserRoleKey }),
          },
          getToken(),
        );
      }
      // A matching permission set means the account simply inherits its role.
      if (!matchesRole || editingUser.user.hasPermissionOverride) {
        await apiRequest(
          `${userPath}/permissions`,
          {
            method: "PATCH",
            body: JSON.stringify({
              permissions: matchesRole ? null : editingUserPermissions,
            }),
          },
          getToken(),
        );
      }
      await query.reload();
      setEditingUser(null);
    } catch (cause) {
      setUserPermissionMessage(
        cause instanceof Error
          ? cause.message
          : "The role and permissions could not be saved.",
      );
      await query.reload();
    } finally {
      setUserPermissionSaving(false);
    }
  }

  if (query.error)
    return (
      <DashboardError
        message={query.error}
        onRetry={() => void query.reload()}
      />
    );
  if (customersQuery.error)
    return (
      <DashboardError
        message={customersQuery.error}
        onRetry={() => void customersQuery.reload()}
      />
    );
  if (
    query.loading ||
    !query.data ||
    customersQuery.loading ||
    !customersQuery.data
  )
    return <DashboardLoading label="Loading users and role assignments…" />;
  if (roleProfilesQuery.error)
    return (
      <DashboardError
        message={roleProfilesQuery.error}
        onRetry={() => void roleProfilesQuery.reload()}
      />
    );
  if (roleProfilesQuery.loading || !roleProfilesQuery.data)
    return <DashboardLoading label="Loading role permissions…" />;

  const data = query.data;
  const customersData = customersQuery.data;
  const roleProfiles = roleProfilesQuery.data.items;
  function roleLabelFor(roleKey: string) {
    if (roleKey === "customer") return "Customer";
    return (
      roleProfiles.find((role) => role.key === roleKey)?.name ??
      roleLabels[roleKey as AdminRoleValue] ??
      roleKey
    );
  }
  const permissionGroups = Array.from(
    adminPermissionValues.reduce((groups, permission) => {
      const group = permission.split(".")[0];
      if (!group) return groups;
      groups.set(group, [...(groups.get(group) ?? []), permission]);
      return groups;
    }, new Map<string, AdminPermissionValue[]>()),
  );
  const allUsers: EditableUser[] = [
    ...data.items.map((user) => ({ kind: "staff" as const, user })),
    ...customersData.items.map((user) => {
      const preview = customerPreviews[user.id];
      const roleKey = preview?.roleKey ?? "customer";
      const rolePermissions =
        roleProfiles.find((role) => role.key === roleKey)?.permissions ?? [];
      return {
        kind: "customer" as const,
        user,
        roleKey,
        permissions: preview?.permissions ?? [...rolePermissions],
      };
    }),
  ];

  const searchTerm = userSearch.trim().toLowerCase();
  const filteredUsers = allUsers.filter((entry) => {
    if (userTypeFilter !== "all" && entry.kind !== userTypeFilter) return false;
    const roleKey = entry.kind === "staff" ? entry.user.roleKey : entry.roleKey;
    if (userRoleFilter && roleKey !== userRoleFilter) return false;
    if (!searchTerm) return true;
    const { firstName, lastName, email } = entry.user;
    return `${firstName} ${lastName} ${email} ${roleLabelFor(roleKey)}`
      .toLowerCase()
      .includes(searchTerm);
  });
  const filtersActive =
    !!searchTerm || userTypeFilter !== "all" || !!userRoleFilter;

  return (
    <main className={styles["dashboard-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles.eyebrow}>Administration</p>
          <h1>Manage roles</h1>
          <p>
            Assign roles to staff and preview role and permission changes for
            customer accounts.
          </p>
        </div>
      </div>

      <section className={styles["crud-card"]}>
        <div
          className={`${styles["card-heading"]} ${styles["role-profile-heading"]}`}
        >
          <div>
            <h2>Existing roles</h2>
          </div>
          <button
            type="button"
            className={`${styles["secondary-button"]} ${styles["role-create-button"]}`}
            onClick={() => {
              setRoleMessage(null);
              setCreateRoleOpen(true);
            }}
          >
            <PlusIcon />
            Create role
          </button>
        </div>
        <div className={styles["role-profile-list"]}>
          {roleListMessage ? (
            <p className={styles["role-list-message"]} role="status">
              {roleListMessage}
            </p>
          ) : null}
          {roleProfiles.map((role) => (
            <article className={styles["role-profile-row"]} key={role.key}>
              <div>
                <strong>{role.name}</strong>
                <span>
                  {role.description ||
                    (role.isCustom ? "Custom role" : "Built-in role")}
                </span>
                <small>{role.permissions.length} permissions</small>
              </div>
              <div className={styles["role-profile-actions"]}>
                <button
                  type="button"
                  className={styles["secondary-button"]}
                  onClick={() => openPermissionEditor(role)}
                >
                  Manage permissions
                </button>
                {role.isCustom ? (
                  <button
                    type="button"
                    className={styles["role-delete-button"]}
                    aria-label={`Delete ${role.name} role`}
                    title={`Delete ${role.name} role`}
                    disabled={roleDeleting}
                    onClick={() => setDeleteTarget(role)}
                  >
                    <TrashIcon />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <Dialog
        open={createRoleOpen}
        title="Create custom role"
        onClose={() => {
          if (!roleSaving) setCreateRoleOpen(false);
        }}
      >
        <form className={styles["role-form"]} onSubmit={createCustomRole}>
          <label>
            <span>Role name</span>
            <input
              required
              value={roleName}
              onChange={(event) => setRoleName(event.target.value)}
              placeholder="For example, Financial Reviewer"
            />
          </label>
          <label>
            <span>Description</span>
            <textarea
              value={roleDescription}
              onChange={(event) => setRoleDescription(event.target.value)}
              placeholder="Describe what this role is for"
              rows={2}
            />
          </label>
          <fieldset className={styles["permission-options"]}>
            <legend>Permissions</legend>
            {adminPermissionValues.map((permission) => (
              <label key={permission}>
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(permission)}
                  onChange={(event) =>
                    setSelectedPermissions((current) =>
                      event.target.checked
                        ? [...current, permission]
                        : current.filter((item) => item !== permission),
                    )
                  }
                />
                {formatPermission(permission)}
              </label>
            ))}
          </fieldset>
          <div className={styles["dialog-actions"]}>
            {roleMessage ? <span role="alert">{roleMessage}</span> : null}
            <button
              type="button"
              className={styles["secondary-button"]}
              disabled={roleSaving}
              onClick={() => setCreateRoleOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={roleSaving || selectedPermissions.length === 0}
            >
              {roleSaving ? "Creating…" : "Create role"}
            </button>
          </div>
        </form>
      </Dialog>

      <section className={`${styles["crud-card"]} ${styles["role-user-list"]}`}>
        <form
          className={`${styles.filters} ${styles["role-user-filters"]}`}
          onSubmit={(event) => event.preventDefault()}
          role="search"
        >
          <label className={styles["search-field"]}>
            <span className="sr-only">Search users</span>
            <SearchIcon />
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search name, email or role"
            />
          </label>
          <label className={styles["filter-field"]}>
            Account type
            <select
              value={userTypeFilter}
              onChange={(event) =>
                setUserTypeFilter(event.target.value as typeof userTypeFilter)
              }
            >
              <option value="all">Staff and customers</option>
              <option value="staff">Staff only</option>
              <option value="customer">Customers only</option>
            </select>
          </label>
          <label className={styles["filter-field"]}>
            Role
            <select
              value={userRoleFilter}
              onChange={(event) => setUserRoleFilter(event.target.value)}
            >
              <option value="">All roles</option>
              {roleProfiles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          {filtersActive ? (
            <button
              type="button"
              className={styles["secondary-button"]}
              onClick={() => {
                setUserSearch("");
                setUserTypeFilter("all");
                setUserRoleFilter("");
              }}
            >
              Clear
            </button>
          ) : null}
        </form>
        <div className={styles["table-wrap"]}>
          <table
            className={`${styles["data-table"]} ${styles["role-user-table"]}`}
          >
            <thead>
              <tr>
                <th style={{ width: "40%" }}>User</th>
                <th style={{ width: "20%" }}>Current status</th>
                <th style={{ width: "20%" }}>Role</th>
                <th style={{ width: "20%" }} aria-label="Manage user permissions"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((entry) => {
                const user = entry.user;
                const roleKey =
                  entry.kind === "staff" ? entry.user.roleKey : entry.roleKey;
                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{`${user.firstName} ${user.lastName}`}</strong>
                      <span>{user.email}</span>
                    </td>
                    <td className={styles["role-user-status"]}>
                      <span className={styles.badge}>
                        {formatEnum(user.status)}
                      </span>
                      <span>{formatAdminDate(user.createdAt, null)}</span>
                    </td>
                    <td>{roleLabelFor(roleKey)}</td>
                    <td className={styles["role-user-actions"]}>
                      <button
                        type="button"
                        className={styles["secondary-button"]}
                        onClick={() => openUserPermissionEditor(entry)}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4}>No users match your search.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <span>
            {filtersActive
              ? `${filteredUsers.length.toLocaleString()} of ${allUsers.length.toLocaleString()} accounts shown`
              : `${allUsers.length.toLocaleString()} accounts shown`}{" "}
            ({data.total.toLocaleString()} staff,{" "}
            {customersData.total.toLocaleString()} customers)
          </span>
        </div>
      </section>

      {editingRole ? (
        <div className={styles["dialog-backdrop"]}>
          <section
            className={styles["role-permission-dialog"]}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-permission-title"
          >
            <div className={styles["card-heading"]}>
              <div>
                <p className={styles.eyebrow}>Permission matrix</p>
                <h2 id="role-permission-title">{editingRole.name}</h2>
                <p>
                  {editingRole.description ||
                    "Choose the permissions for this role."}
                </p>
              </div>
              <button
                type="button"
                className={styles["icon-button"]}
                aria-label="Close permission editor"
                onClick={() => setEditingRole(null)}
              >
                ×
              </button>
            </div>
            <form onSubmit={saveRolePermissions}>
              <div className={styles["permission-matrix"]}>
                {permissionGroups.map(([group, permissions]) => (
                  <fieldset className={styles["permission-group"]} key={group}>
                    <legend>
                      {formatPermission(`${group}.view`).split(" · ")[0]}
                    </legend>
                    {permissions.map((permission) => {
                      const locked =
                        editingRole.key === AdminRole.SUPER_ADMIN &&
                        (permission === "settings.full" ||
                          permission === "user_management.view");
                      return (
                        <label key={permission}>
                          <input
                            type="checkbox"
                            checked={editingPermissions.includes(permission)}
                            disabled={locked || permissionSaving}
                            onChange={(event) =>
                              setEditingPermissions((current) =>
                                event.target.checked
                                  ? [...current, permission]
                                  : current.filter(
                                      (item) => item !== permission,
                                    ),
                              )
                            }
                          />
                          {formatPermission(permission)}
                        </label>
                      );
                    })}
                  </fieldset>
                ))}
              </div>
              {editingRole.key === AdminRole.SUPER_ADMIN ? (
                <p className={styles["matrix-note"]}>
                  Super Admin must retain full settings and user-management view
                  access.
                </p>
              ) : null}
              <div className={styles["dialog-actions"]}>
                {permissionSaveMessage ? (
                  <span role="alert">{permissionSaveMessage}</span>
                ) : null}
                <button
                  type="button"
                  className={styles["secondary-button"]}
                  onClick={() => setEditingRole(null)}
                  disabled={permissionSaving}
                >
                  Cancel
                </button>
                <button type="submit" disabled={permissionSaving}>
                  {permissionSaving ? "Saving…" : "Save permissions"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      {editingUser ? (
        <div className={styles["dialog-backdrop"]}>
          <section
            className={styles["role-permission-dialog"]}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-permission-title"
          >
            <div className={styles["card-heading"]}>
              <div>
                <p className={styles.eyebrow}>Individual access</p>
                <h2 id="user-permission-title">
                  {editingUser.user.firstName} {editingUser.user.lastName}
                </h2>
                <p>
                  {editingUser.kind === "staff"
                    ? "Customize this account’s complete permission set. These permissions override its assigned role."
                    : "Preview this customer’s complete permission set. Changes are not saved."}
                </p>
              </div>
              <button
                type="button"
                className={styles["icon-button"]}
                aria-label="Close individual permission editor"
                disabled={userPermissionSaving}
                onClick={() => setEditingUser(null)}
              >
                ×
              </button>
            </div>
            <form onSubmit={saveUserPermissions}>
              <label className={styles["role-select-field"]}>
                Role
                <select
                  value={editingUserRoleKey}
                  disabled={userPermissionSaving}
                  onChange={(event) =>
                    changeEditingUserRole(event.target.value)
                  }
                >
                  {editingUser.kind === "customer" ? (
                    <option value="customer">Customer</option>
                  ) : null}
                  {roleOrder.map((role) => (
                    <option value={role} key={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                  {roleProfiles
                    .filter((role) => role.isCustom)
                    .map((role) => (
                      <option value={role.key} key={role.key}>
                        {role.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className={styles["permission-matrix"]}>
                {permissionGroups.map(([group, permissions]) => (
                  <fieldset className={styles["permission-group"]} key={group}>
                    <legend>
                      {formatPermission(`${group}.view`).split(" · ")[0]}
                    </legend>
                    {permissions.map((permission) => {
                      const locked =
                        editingUserRoleKey === AdminRole.SUPER_ADMIN &&
                        (permission === "settings.full" ||
                          permission === "user_management.view");
                      return (
                        <label key={permission}>
                          <input
                            type="checkbox"
                            checked={editingUserPermissions.includes(
                              permission,
                            )}
                            disabled={locked || userPermissionSaving}
                            onChange={(event) =>
                              setEditingUserPermissions((current) =>
                                event.target.checked
                                  ? [...current, permission]
                                  : current.filter(
                                      (item) => item !== permission,
                                    ),
                              )
                            }
                          />
                          {formatPermission(permission)}
                        </label>
                      );
                    })}
                  </fieldset>
                ))}
              </div>
              {editingUserRoleKey === AdminRole.SUPER_ADMIN ? (
                <p className={styles["matrix-note"]}>
                  Super Admin accounts must retain full settings and
                  user-management view access.
                </p>
              ) : null}
              <div className={styles["dialog-actions"]}>
                {userPermissionMessage ? (
                  <span role="alert">{userPermissionMessage}</span>
                ) : null}
                <button
                  type="button"
                  className={styles["secondary-button"]}
                  disabled={userPermissionSaving}
                  onClick={() => changeEditingUserRole(editingUserRoleKey)}
                >
                  Use role permissions
                </button>
                <button
                  type="button"
                  className={styles["secondary-button"]}
                  onClick={() => setEditingUser(null)}
                  disabled={userPermissionSaving}
                >
                  Cancel
                </button>
                <button type="submit" disabled={userPermissionSaving}>
                  {userPermissionSaving ? "Saving…" : "Save permissions"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete custom role?"
        message={`${deleteTarget?.name ?? "This role"} will be permanently deleted. Any users assigned to it must be reassigned first.`}
        confirmLabel={roleDeleting ? "Deleting…" : "Delete role"}
        onConfirm={() => void deleteCustomRole()}
        onCancel={() => {
          if (!roleDeleting) setDeleteTarget(null);
        }}
      />
    </main>
  );
}
