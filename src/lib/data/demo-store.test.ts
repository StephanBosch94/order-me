import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { orderConfirmationEmail } from "@/lib/buyer";
import { DemoStore } from "@/lib/data/demo-store";
import { DataError } from "@/lib/errors";

async function withStore(run: (store: DemoStore) => Promise<void>) {
  const dir = await mkdtemp(path.join(tmpdir(), "poruci-"));
  const store = new DemoStore(path.join(dir, "db.json"), { seed: false });
  try {
    await run(store);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("isolates suppliers and keeps order snapshots", async () => {
  await withStore(async (store) => {
    const firstUser = await store.createUser({
      name: "Ana Petrović",
      email: "ana@example.com",
      password: "lozinka123",
    });
    const secondUser = await store.createUser({
      name: "Marko Jović",
      email: "marko@example.com",
      password: "lozinka123",
    });
    const first = await store.createOrganization({
      userId: firstUser.id,
      userName: firstUser.name,
      userEmail: firstUser.email,
      name: "Gastro Supply",
      slug: "gastro-supply",
      phone: "",
    });
    const second = await store.createOrganization({
      userId: secondUser.id,
      userName: secondUser.name,
      userEmail: secondUser.email,
      name: "Druga Firma",
      slug: "druga-firma",
      phone: "",
    });
    const product = await store.createProduct(first.id, {
      name: "Salvete",
      sku: "SV",
      description: "",
      categoryId: null,
      newCategory: "Ugostiteljstvo",
      unit: "paket",
      pricePara: 18900,
      salePricePara: null,
      minQuantity: 1,
      active: true,
    });

    const created = await store.createPublicOrder(
      {
        slug: "gastro-supply",
        idempotencyKey: crypto.randomUUID(),
        businessName: "Kafić Luna",
        contactName: "Jelena Ilić",
        email: "jelena@kaficluna.rs",
        phone: "+38164111222",
        pib: "",
        address: "Zmaj Jovina 12",
        city: "Novi Sad",
        notes: "Pre podne",
        items: [{ productId: product.id, quantity: 2 }],
      },
      "127.0.0.1",
    );
    assert.equal(created.ok, true);
    if (!created.ok) return;

    assert.equal(await store.getOrder(second.id, created.order.id), null);
    assert.deepEqual(await store.listProducts(second.id), []);
    assert.equal(await store.updateProduct(second.id, product.id, {
      name: "Tuđe",
      sku: "X",
      description: "",
      categoryId: null,
      newCategory: "",
      unit: "komad",
      pricePara: 1,
      salePricePara: null,
      minQuantity: 1,
      active: true,
    }), null);

    await store.updateProduct(first.id, product.id, {
      name: "Salvete nove",
      sku: "SV",
      description: "",
      categoryId: product.categoryId,
      newCategory: "",
      unit: "paket",
      pricePara: 20000,
      salePricePara: null,
      minQuantity: 1,
      active: true,
    });
    const historical = await store.getOrder(first.id, created.order.id);
    assert.equal(historical?.items[0]?.name, "Salvete");
    assert.equal(historical?.items[0]?.unitPricePara, 18900);

    const duplicate = await store.createPublicOrder(
      {
        slug: "gastro-supply",
        idempotencyKey: created.order.idempotencyKey,
        businessName: "Druga porudžbina",
        contactName: "Neko",
        email: "drugo@example.com",
        phone: "+38164111000",
        pib: "",
        address: "",
        city: "",
        notes: "",
        items: [{ productId: product.id, quantity: 9 }],
      },
      "127.0.0.1",
    );
    assert.equal(duplicate.ok, true);
    if (duplicate.ok) {
      assert.equal(duplicate.duplicate, true);
      assert.equal(duplicate.order.id, created.order.id);
    }

    const updated = await store.updateOrderStatus(first.id, created.order.id, "potvrdjena", "Ana Petrović");
    assert.equal(updated?.status, "potvrdjena");
    assert.equal(updated?.history.length, 2);
    assert.equal(await store.updateOrderStatus(second.id, created.order.id, "otkazana", "Marko"), null);

    const wrongSupplier = await store.getPublicCatalog("nepostojeca-firma");
    assert.equal(wrongSupplier, null);
  });
});

test("buyer account sees only orders placed with that account", async () => {
  await withStore(async (store) => {
    const seller = await store.createUser({
      name: "Ana Petrović",
      email: "ana@example.com",
      password: "lozinka123",
    });
    const organization = await store.createOrganization({
      userId: seller.id,
      userName: seller.name,
      userEmail: seller.email,
      name: "Gastro Supply",
      slug: "gastro-supply",
      phone: "",
    });
    const product = await store.createProduct(organization.id, {
        name: "Salvete",
        sku: "SV",
        description: "",
        categoryId: null,
        newCategory: "",
        unit: "paket",
        pricePara: 10000,
        salePricePara: null,
        minQuantity: 1,
        active: true,
      },
    );
    const buyer = await store.createUser({
      name: "Milan Testić",
      email: "milan@bistro.rs",
      password: "lozinka123",
      kind: "buyer",
      businessName: "Bistro Test",
      phone: "064111222",
    });
    const account = await store.resolveAccount(buyer.id);
    assert.equal(account?.kind, "buyer");
    const sellerAccount = await store.resolveAccount(seller.id);
    assert.equal(sellerAccount?.kind, "supplier");

    const created = await store.createPublicOrder(
      {
        slug: "gastro-supply",
        idempotencyKey: crypto.randomUUID(),
        businessName: "Bistro Test",
        contactName: "Milan Testić",
        email: "milan@bistro.rs",
        phone: "064111222",
        pib: "",
        address: "",
        city: "Beograd",
        notes: "",
        items: [{ productId: product.id, quantity: 1 }],
        buyerUserId: buyer.id,
        confirmationEmail: "racuni@bistro.rs",
      },
      "127.0.0.1",
    );
    assert.equal(created.ok, true);
    if (created.ok) {
      assert.equal(created.order.customerSnapshot.email, "milan@bistro.rs");
      assert.equal(created.order.customerSnapshot.confirmationEmail, "racuni@bistro.rs");
      assert.equal(orderConfirmationEmail(created.order.customerSnapshot), "racuni@bistro.rs");
    }
    const orders = await store.listBuyerOrders(buyer.id);
    assert.equal(orders.length, 1);
    assert.equal(orders[0]?.supplierName, "Gastro Supply");
    assert.deepEqual(await store.listBuyerOrders(seller.id), []);
    assert.equal(await store.getAccount(buyer.id), null);
  });
});

test("listOrders separates company orders and keeps cancelled ones", async () => {
  await withStore(async (store) => {
    const seller = await store.createUser({
      name: "Ana Petrović",
      email: "ana@example.com",
      password: "lozinka123",
    });
    const organization = await store.createOrganization({
      userId: seller.id,
      userName: seller.name,
      userEmail: seller.email,
      name: "Gastro Supply",
      slug: "gastro-supply",
      phone: "",
    });
    const product = await store.createProduct(organization.id, {
      name: "Salvete",
      sku: "SV",
      description: "",
      categoryId: null,
      newCategory: "",
      unit: "paket",
      pricePara: 10000,
      salePricePara: null,
      minQuantity: 1,
      active: true,
    });

    async function place(input: {
      email: string;
      businessName: string;
      pib: string;
      paymentMethod?: "pouzecem" | "kartica" | "racun" | null;
    }) {
      const created = await store.createPublicOrder(
        {
          slug: "gastro-supply",
          idempotencyKey: crypto.randomUUID(),
          businessName: input.businessName,
          contactName: "Kontakt",
          email: input.email,
          phone: "064111222",
          pib: input.pib,
          address: "Ulica 1",
          city: "Beograd",
          notes: "",
          items: [{ productId: product.id, quantity: 1 }],
          paymentMethod: input.paymentMethod,
        },
        "127.0.0.1",
      );
      assert.equal(created.ok, true);
      if (!created.ok) throw new Error("Porudžbina nije sačuvana.");
      return created.order;
    }

    const byPib = await place({ email: "marko@restorandunav.rs", businessName: "Restoran Dunav", pib: "108765432" });
    const byInvoice = await place({
      email: "racun@firma.rs",
      businessName: "Firma bez PIB-a",
      pib: "",
      paymentMethod: "racun",
    });
    const personal = await place({
      email: "jovana@example.rs",
      businessName: "Jovana Ilić",
      pib: "",
      paymentMethod: "kartica",
    });
    const cancelled = await place({ email: "otkaz@firma.rs", businessName: "Pekara Zrno", pib: "106543210" });
    const updated = await store.updateOrderStatus(organization.id, cancelled.id, "otkazana", "Ana Petrović");
    assert.equal(updated?.status, "otkazana");

    const companies = await store.listOrders(organization.id, { company: true, pageSize: 20 });
    const others = await store.listOrders(organization.id, { company: false, pageSize: 20 });
    const all = await store.listOrders(organization.id, { pageSize: 20 });

    assert.deepEqual(
      companies.items.map((order) => order.id).sort(),
      [byPib.id, byInvoice.id, cancelled.id].sort(),
    );
    assert.equal(companies.items.find((order) => order.id === cancelled.id)?.status, "otkazana");
    assert.deepEqual(others.items.map((order) => order.id), [personal.id]);
    assert.equal(all.total, 4);
  });
});

test("a buyer can update their own profile without changing the login email", async () => {
  await withStore(async (store) => {
    const company = await store.createUser({
      name: "Marko Jović",
      email: "marko@restorandunav.rs",
      password: "lozinka123",
      kind: "buyer",
      businessName: "Restoran Dunav",
      phone: "+381 63 111 2200",
      address: "Bulevar kralja Aleksandra 142",
      city: "Beograd",
      pib: "108765432",
      mb: "20123456",
      postalCode: "11000",
      bankAccount: "160-0000000011111-45",
    });
    await store.updateBuyerProfile(company.id, {
      name: "Marko Jović",
      businessName: "Restoran Dunav",
      phone: "0639998877",
      address: "Bulevar kralja Aleksandra 142",
      city: "Beograd",
      pib: "108765432",
      mb: "20123456",
      postalCode: "11000",
      bankAccount: "160-0000000011111-45",
      confirmationEmail: "Racuni@RestoranDunav.rs",
    });
    const updated = await store.resolveAccount(company.id);
    assert.equal(updated?.kind, "buyer");
    if (updated?.kind !== "buyer") return;
    assert.equal(updated.email, "marko@restorandunav.rs");
    assert.equal(updated.confirmationEmail, "Racuni@RestoranDunav.rs");
    assert.equal(orderConfirmationEmail(updated), "Racuni@RestoranDunav.rs");
    assert.equal(updated.phone, "0639998877");
    assert.equal(updated.businessName, "Restoran Dunav");
    assert.equal(updated.bankAccount, "160-0000000011111-45");
    assert.equal(updated.mb, "20123456");

    const person = await store.createUser({
      name: "Jovana Ilić",
      email: "jovana@butikvera.rs",
      password: "lozinka123",
      kind: "buyer",
      phone: "+381 64 555 0199",
      address: "Knez Mihailova 18",
      city: "Beograd",
    });
    await store.updateBuyerProfile(person.id, {
      name: "Jovana Ilić",
      businessName: "",
      phone: "+381 64 555 0199",
      address: "Knez Mihailova 22",
      city: "Novi Sad",
      pib: "",
      mb: "",
      postalCode: "",
      bankAccount: "",
      confirmationEmail: "",
    });
    const personal = await store.resolveAccount(person.id);
    assert.equal(personal?.kind, "buyer");
    if (personal?.kind !== "buyer") return;
    assert.equal(personal.email, "jovana@butikvera.rs");
    assert.equal(personal.confirmationEmail, "");
    assert.equal(orderConfirmationEmail(personal), "jovana@butikvera.rs");
    assert.equal(personal.address, "Knez Mihailova 22");
    assert.equal(personal.city, "Novi Sad");
    assert.equal(personal.pib, "");

    const seller = await store.createUser({
      name: "Ana Petrović",
      email: "ana@example.com",
      password: "lozinka123",
    });
    await assert.rejects(
      () =>
        store.updateBuyerProfile(seller.id, {
          name: "Ana Petrović",
          businessName: "",
          phone: "064111222",
          address: "Ulica 1",
          city: "Beograd",
          pib: "",
          mb: "",
          postalCode: "",
          bankAccount: "",
          confirmationEmail: "",
        }),
      (error: unknown) => error instanceof DataError && error.message === "Nalog nije pronađen.",
    );
  });
});

test("owner adds a staff member to the same shop", async () => {
  await withStore(async (store) => {
    const owner = await store.createUser({
      name: "Ana Petrović",
      email: "ana@example.com",
      password: "lozinka123",
    });
    const organization = await store.createOrganization({
      userId: owner.id,
      userName: owner.name,
      userEmail: owner.email,
      name: "Mesara Pajić",
      slug: "mesara-test",
      phone: "",
    });
    const employee = await store.addStaffMember(organization.id, {
      name: "Petar Jović",
      email: "Petar@MesaraPajic.rs",
      password: "lozinka123",
    });
    assert.equal(employee.role, "staff");
    assert.equal(employee.email, "petar@mesarapajic.rs");

    const account = await store.resolveAccount(employee.userId);
    assert.equal(account?.kind, "supplier");
    if (account?.kind !== "supplier") return;
    assert.equal(account.role, "staff");
    assert.equal(account.organization.id, organization.id);

    const members = await store.listMembers(organization.id);
    assert.deepEqual(
      members.map((member) => ({ email: member.email, role: member.role })),
      [
        { email: "ana@example.com", role: "owner" },
        { email: "petar@mesarapajic.rs", role: "staff" },
      ],
    );
    const login = await store.verifyCredentials("petar@mesarapajic.rs", "lozinka123");
    assert.equal(login?.id, employee.userId);

    await assert.rejects(
      () =>
        store.addStaffMember(organization.id, {
          name: "Drugi Ana",
          email: "ANA@example.com",
          password: "lozinka123",
        }),
      (error: unknown) => error instanceof DataError && error.message === "Nalog sa ovom email adresom već postoji.",
    );
  });
});
