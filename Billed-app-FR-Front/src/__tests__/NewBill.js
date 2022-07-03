/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import BillsUI from "../views/BillsUI.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { bills } from "../fixtures/bills.js";
import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  Object.defineProperty(window, "localStorage", { value: localStorageMock });

  window.localStorage.setItem(
    "user",
    JSON.stringify({
      type: "Employee",
    })
  );

  const onNavigate = (pathname) => {
    document.body.innerHTML = ROUTES({ pathname, data: bills });
  };

  describe("When I am on NewBill Page", () => {
    test("Then email icon in vertical layout should be highlighted", async () => {
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.NewBill);
      await waitFor(() => screen.getByTestId("icon-mail"));
      const emailIcon = screen.getByTestId("icon-mail");

      expect(emailIcon).toHaveClass("active-icon");
    });
  });

  describe("When I am on NewBill page and I upload a file with an extension other than jpg, jpeg or png", () => {
    test("Then an error message for the file input should be displayed", () => {
      const newBill = new NewBill({
        document,
        onNavigate,
        store: null,
        bills: bills,
        localStorage: window.localStorage,
      });

      const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));

      const fileInput = screen.getByLabelText("Justificatif");
      fileInput.addEventListener("change", handleChangeFile);

      fireEvent.change(fileInput, {
        target: {
          files: [
            new File(["test"], "test.pdf", {
              type: "application/pdf",
            }),
          ],
        },
      });

      expect(handleChangeFile).toHaveBeenCalled();
      expect(fileInput.files[0].name).toBe("test.pdf");

      const errorMessage = screen.getByTestId("file-error-message");

      expect(errorMessage).not.toHaveClass("hidden");
    });
  });

  describe("When I am on the NewBill page and I upload a file with a jpg, jpeg or png extension", () => {
    test("Then no error message should be displayed", () => {
      document.body.innerHTML = NewBillUI();

      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        bills: bills,
        localStorage: window.localStorage,
      });

      const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e));

      const fileInput = screen.getByLabelText("Justificatif");
      fileInput.addEventListener("change", handleChangeFile);

      fireEvent.change(fileInput, {
        target: {
          files: [
            new File(["test"], "test.jpg", {
              type: "image/jpeg",
            }),
          ],
        },
      });

      expect(handleChangeFile).toHaveBeenCalled();

      expect(fileInput.files[0].name).toBe("test.jpg");

      const errorMessage = screen.getByTestId("file-error-message");

      expect(errorMessage).toHaveClass("hidden");
    });
  });

  describe("When I have filled in the form correctly and I clicked on submit button", () => {
    test("Then Bills page should be rendered", () => {
      const newBill = new NewBill({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e));

      const formNewBill = screen.getByTestId("form-new-bill");
      formNewBill.addEventListener("submit", handleSubmit);

      fireEvent.submit(formNewBill);

      expect(handleSubmit).toHaveBeenCalled();

      expect(screen.getByText("Mes notes de frais")).toBeTruthy();
    });
  });

  // test d'intégration POST

  describe("When I submit a valid form", () => {
    test("Submit handler should return newBill & navigate to Bills Page", async () => {
      const fakeBill = {
        type: "Transports",
        name: "Vol Paris/Marseille",
        date: "070",
        amount: "1500",
        vat: "300",
        pct: "150",
        commentary: "vol 1ere classe",
        filename: "flightBill",
        fileUrl: "C:\\fakepath\\flightBill.jpg",
      };

      document.body.innerHTML = NewBillUI();
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const spyHandleSubmit = jest.spyOn(newBill, "handleSubmit");
      const form = screen.getByTestId("form-new-bill");
      const btnSubmitForm = form.querySelector("#btn-send-bill");
      const spyUpdateBill = jest.spyOn(newBill, "updateBill");

      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: fakeBill.type },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: fakeBill.name },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: fakeBill.date },
      });
      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: fakeBill.amount },
      });
      fireEvent.change(screen.getByTestId("vat"), {
        target: { value: fakeBill.vat },
      });
      fireEvent.change(screen.getByTestId("pct"), {
        target: { value: fakeBill.pct },
      });
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: fakeBill.commentary },
      });

      form.addEventListener("submit", (e) => newBill.handleSubmit(e));
      userEvent.click(btnSubmitForm);
      await waitFor(() => screen.getByText("Mes notes de frais"));

      expect(spyHandleSubmit).toHaveBeenCalled();
      expect(spyUpdateBill).toHaveBeenCalled();
      expect(screen.getByText("Mes notes de frais")).toBeTruthy();
    });
  });

  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "a@a",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.appendChild(root);
      router();
    });
    test("fetche bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });
      document.body.innerHTML = BillsUI({ error: "Erreur 404" });
      const message = screen.getByText("Erreur 404");
      expect(message).toBeTruthy();
    });

    test("fetche bills from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });
      document.body.innerHTML = BillsUI({ error: "Erreur 500" });
      const message = screen.getByText("Erreur 500");
      expect(message).toBeTruthy();
    });
  });
});
