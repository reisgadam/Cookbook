import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../components/Toast";

type Listener = (user: unknown) => void;

const fake = vi.hoisted(() => ({
  user: null as null | { uid: string; email: string; isAnonymous: boolean },
  admin: false,
  comments: [] as Array<Record<string, unknown>>,
  signInWithGoogle: vi.fn(),
  signOutUser: vi.fn(),
  setCommentStatus: vi.fn(() => Promise.resolve()),
  deleteComment: vi.fn(() => Promise.resolve()),
}));

vi.mock("../community/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../community/config")>()),
  communityEnabled: true,
}));

vi.mock("../community/firebase", () => ({
  watchUser: (listener: Listener) => {
    listener(fake.user);
    return () => {};
  },
  isAdmin: async () => fake.admin,
  signInWithGoogle: fake.signInWithGoogle,
  signOutUser: fake.signOutUser,
  watchAllComments: (callback: (list: unknown[]) => void) => {
    callback(fake.comments);
    return () => {};
  },
  setCommentStatus: fake.setCommentStatus,
  deleteComment: fake.deleteComment,
}));

const { Admin } = await import("./Admin");

function renderAdmin() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Admin />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fake.user = null;
  fake.admin = false;
  fake.comments = [];
  vi.clearAllMocks();
});

describe("Admin", () => {
  it("asks visitors to sign in with Google", async () => {
    renderAdmin();
    await userEvent.click(await screen.findByRole("button", { name: /sign in with google/i }));
    expect(fake.signInWithGoogle).toHaveBeenCalled();
  });

  it("tells a signed-in owner how to become an admin", async () => {
    fake.user = { uid: "uid-123", email: "owner@example.com", isAnonymous: false };
    renderAdmin();
    expect(await screen.findByText(/isn’t an admin yet/)).toBeInTheDocument();
    expect(screen.getByText("uid-123")).toBeInTheDocument();
  });

  it("lets an admin hide and delete notes", async () => {
    fake.user = { uid: "owner", email: "owner@example.com", isAnonymous: false };
    fake.admin = true;
    fake.comments = [
      {
        id: "c1",
        threadId: "recipe:apple-pie",
        name: "Aunt Sue",
        body: "Double the cinnamon!",
        uid: "x",
        createdAt: new Date(),
        status: "visible",
      },
      {
        id: "c2",
        threadId: "guestbook",
        name: "Spammer",
        body: "Buy now",
        uid: "y",
        createdAt: new Date(),
        status: "hidden",
      },
    ];
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderAdmin();

    expect(await screen.findByText("Double the cinnamon!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Apple Pie" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Guestbook" })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Hide" })[0]);
    expect(fake.setCommentStatus).toHaveBeenCalledWith("c1", "hidden");

    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(fake.setCommentStatus).toHaveBeenCalledWith("c2", "visible");

    await userEvent.click(screen.getAllByRole("button", { name: "Delete" })[1]);
    await waitFor(() => expect(fake.deleteComment).toHaveBeenCalledWith("c2"));

    await userEvent.click(screen.getByRole("button", { name: /hidden \(1\)/i }));
    expect(screen.queryByText("Double the cinnamon!")).not.toBeInTheDocument();
  });
});
