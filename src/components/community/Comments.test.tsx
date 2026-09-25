import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoError } from "../../community/photo";
import { removeStored } from "../../lib/storage";

const fake = vi.hoisted(() => ({
  post: vi.fn(() => Promise.resolve()),
  preparePhoto: vi.fn(),
}));

vi.mock("../../community/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../community/store")>()),
  useThread: () => ({ status: "ready", comments: [], post: fake.post, remove: vi.fn(), uid: "me" }),
}));

vi.mock("../../community/photo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../community/photo")>()),
  preparePhoto: fake.preparePhoto,
}));

const { Comments } = await import("./Comments");

const photo = { blob: new Blob(["jpeg"], { type: "image/jpeg" }), width: 1280, height: 960 };
const file = () => new File(["original"], "dinner.jpg", { type: "image/jpeg" });

describe("adding a note with a photo", () => {
  beforeEach(() => {
    // The form remembers your name for next time.
    removeStored("commenter-name");
    fake.post.mockClear();
    fake.preparePhoto.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  async function fillName() {
    const user = userEvent.setup();
    render(<Comments threadId="recipe:apple-pie" intro="Share a photo." />);
    await user.type(screen.getByLabelText("Your name"), "Aunt Sue");
    return user;
  }

  it("asks for a note or a photo", async () => {
    const user = await fillName();
    await user.click(screen.getByRole("button", { name: "Post note" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please write a note or add a photo.");
    expect(fake.post).not.toHaveBeenCalled();
  });

  it("posts a photo on its own, and shows a preview first", async () => {
    fake.preparePhoto.mockResolvedValue(photo);
    const user = await fillName();
    await user.upload(screen.getByLabelText("Add a photo"), file());
    expect(await screen.findByRole("img", { name: "Preview of what you’re adding" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Post note" }));
    expect(fake.post).toHaveBeenCalledWith("Aunt Sue", "", photo);
    expect(screen.queryByRole("img", { name: "Preview of what you’re adding" })).not.toBeInTheDocument();
  });

  it("lets you take the photo back off", async () => {
    fake.preparePhoto.mockResolvedValue(photo);
    const user = await fillName();
    await user.upload(screen.getByLabelText("Add a photo"), file());
    await user.click(await screen.findByRole("button", { name: "Remove the photo" }));
    expect(screen.queryByRole("img", { name: "Preview of what you’re adding" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Add a photo")).toBeInTheDocument();
  });

  it("explains when a photo can't be used", async () => {
    fake.preparePhoto.mockRejectedValue(new PhotoError("This photo can’t be opened here."));
    const user = await fillName();
    await user.upload(screen.getByLabelText("Add a photo"), file());
    expect(await screen.findByRole("alert")).toHaveTextContent("This photo can’t be opened here.");
  });
});
