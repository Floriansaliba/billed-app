/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import { getByTestId, getByText, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import Bills from "../containers/Bills.js";
import userEvent from "@testing-library/user-event";
import LoadingPage from "../views/LoadingPage.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockedStore from "../__mocks__/store";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import router from "../app/Router.js";
import { formatDate, formatStatus } from "../app/format.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bills should be ordered from earliest to latest", () => {
      const html = BillsUI({ data: bills });
      document.body.innerHTML = html;
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
    test("Then bill icon in vertical layout should be highlighted", () => {
      const html = BillsUI({ data: [] });
      document.body.innerHTML = html;
      //to-do write expect expression
      const title = getByTestId(document.body, "title");
      expect(title.className).toBe("layout-title");
    });
    test("if bills are stored, it should display bills", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      const newBills = new Bills({
        document,
        onNavigate,
        store: mockedStore,
        localStorage: window.localStorage,
      });
      const spyGetBills = jest.spyOn(newBills, "getBills");
      const billsToDisplay = await newBills.getBills();
      const mockedBills = await mockedStore.bills().list();

      expect(spyGetBills).toHaveBeenCalledTimes(1);
      expect(mockedBills.length).toBe(billsToDisplay.length);
    });
  });
  describe("When I'm on Bill Page and I click on the button to add a new bill", () => {
    test("Then modal should open", () => {
      const html = BillsUI({ data: bills });
      document.body.innerHTML = html;
      const buttonNewBill = getByTestId(document.body, "btn-new-bill");
      const modal = getByTestId(document.body, "modal");
      // Simuler le click sur le bouton
      userEvent.click(buttonNewBill);
      expect(modal.getAttribute("aria-hidden")).toBe("true");
    });
  });
  describe("When Bill page is loading", () => {
    test("Then it should render the loading page", () => {
      const html = BillsUI({ loading: true });
      document.body.innerHTML = html;
      const loadingMessage = getByText(document.body, "Loading...");
      expect(loadingMessage.id).toBe("loading");
    });
  });
  describe("When Bill page send Error", () => {
    test("Then is should render an Error message to the user", () => {
      const html = BillsUI({ error: true });
      document.body.innerHTML = html;
      const errorMessage = getByTestId(document.body, "error-message");
      expect(errorMessage).toBeDefined();
    });
  });
});

describe("when i click on the eye icon button", () => {
  test("then a modal should open", () => {
    const html = BillsUI({ data: bills });
    document.body.innerHTML = html;
    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };
    const bill = new Bills({
      document,
      onNavigate,
      store: null,
      localStorage: window.localStorage,
    });
    $.fn.modal = jest.fn();
    const button = screen.getAllByTestId("icon-eye")[0];
    const handleClickIconEye = jest.fn((e) => {
      e.preventDefault();
      bill.handleClickIconEye(button);
    });
    button.addEventListener("click", handleClickIconEye);
    fireEvent.click(button);

    expect(handleClickIconEye).toHaveBeenCalled();
  });
});

describe("when i click on the make new Bill Button", () => {
  test("a new bill modal should open", () => {
    // LocalStorage - Employee
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
    });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
      })
    );

    const html = BillsUI({ data: [] });
    document.body.innerHTML = html;
    const onNavigate = (pathname) => {
      document.body.innerHTML = ROUTES({ pathname });
    };
    const bills = new Bills({
      document,
      onNavigate,
      firestore: null,
      localStorage: window.localStorage,
    });
    const button = screen.getByTestId("btn-new-bill");
    const handleClickNewBill = jest.fn((e) => bills.handleClickNewBill(e));
    button.click("click", handleClickNewBill);
    fireEvent.click(button);
    expect(screen.getAllByText("Envoyer une note de frais")).toBeTruthy();
  });
});

// test d'intégration GET
describe("Given I am a user connected as Employee", () => {
  describe("When I navigate to bills page", () => {
    test("fetches bills from mock API GET", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "a@a" })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      onNavigate(ROUTES_PATH.Bills);
      const get = jest.fn(mockedStore.bills);
      await waitFor(() => {
        screen.getByText("Mes notes de frais");
        screen.getByText("Nouvelle note de frais");
        screen.getAllByTestId("tbody");
      });
      expect(screen.getByText("Mes notes de frais")).toBeTruthy;
      expect(screen.getByText("Nouvelle note de frais")).toBeTruthy;
      expect(screen.getByTestId("tbody")).toBeTruthy;
      expect(get).toHaveBeenCalled;
    });
  });
  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockedStore, "bills");
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
    test("fetches bills from an API and fails with 404 message error", async () => {
      mockedStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });
      document.body.innerHTML = BillsUI({ error: "Erreur 404" });
      const message = screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    test("fetches bills from an API and fails with 500 message error", async () => {
      mockedStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });
      document.body.innerHTML = BillsUI({ error: "Erreur 500" });
      const message = screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
