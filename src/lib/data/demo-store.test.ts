import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { orderConfirmationEmail } from "@/lib/buyer";
import { STORE_MANUAL_MESSAGE } from "@/lib/constants";
import { parseCustomerCsv } from "@/lib/csv";
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
      stockQuantity: 0,
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
    assert.equal(created.order.customerSnapshot.code, "K-0001");

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
      stockQuantity: 0,
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
      stockQuantity: 12,
      active: true,
    });
    assert.equal((await store.getProduct(first.id, product.id))?.stockQuantity, 12);
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
        stockQuantity: 0,
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
      stockQuantity: 0,
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
    assert.equal(all.items.find((order) => order.id === byPib.id)?.party, "pravna");
    assert.equal(all.items.find((order) => order.id === personal.id)?.party, "fizicka");
    assert.equal(all.items.find((order) => order.id === byInvoice.id)?.party, "fizicka");
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
      role: "staff",
    });
    assert.equal(employee.role, "staff");
    const admin = await store.addStaffMember(organization.id, {
      name: "Ivana Admin",
      email: "ivana.admin@mesarapajic.rs",
      password: "lozinka123",
      role: "admin",
    });
    assert.equal(admin.role, "admin");
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
        { email: "ivana.admin@mesarapajic.rs", role: "admin" },
        { email: "petar@mesarapajic.rs", role: "staff" },
      ],
    );
    const login = await store.verifyCredentials("petar@mesarapajic.rs", "lozinka123");
    assert.equal(login?.id, employee.userId);
    const changed = await store.changePassword(employee.userId, "lozinka123", "nova-lozinka");
    assert.equal(changed.email, "petar@mesarapajic.rs");
    assert.equal(await store.verifyCredentials("petar@mesarapajic.rs", "lozinka123"), null);
    assert.equal((await store.verifyCredentials("petar@mesarapajic.rs", "nova-lozinka"))?.id, employee.userId);
    await assert.rejects(
      () => store.changePassword(employee.userId, "pogresna", "jos-jedna-lozinka"),
      (error: unknown) => error instanceof DataError && error.message === "Trenutna lozinka nije tačna.",
    );
    await store.changePassword(owner.id, "lozinka123", "vlasnik-lozinka");
    assert.equal((await store.verifyCredentials("ana@example.com", "vlasnik-lozinka"))?.id, owner.id);
    const buyer = await store.createUser({
      name: "Marko Kupac",
      email: "marko.kupac@example.com",
      password: "lozinka123",
      kind: "buyer",
    });
    await store.changePassword(buyer.id, "lozinka123", "kupac-lozinka");
    assert.equal((await store.verifyCredentials("marko.kupac@example.com", "kupac-lozinka"))?.id, buyer.id);

    await assert.rejects(
      () =>
        store.addStaffMember(organization.id, {
          name: "Drugi Ana",
          email: "ANA@example.com",
          password: "lozinka123",
          role: "staff",
        }),
      (error: unknown) => error instanceof DataError && error.message === "Nalog sa ovom email adresom već postoji.",
    );
  });
});

test("a distributor can add a customer and an order", async () => {
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
      name: "Mesara Pajić",
      slug: "mesara-test",
      phone: "",
    });
    const product = await store.createProduct(organization.id, {
      name: "Svinjski but",
      sku: "MP-BUT",
      description: "",
      categoryId: null,
      newCategory: "",
      unit: "kilogram",
      pricePara: 78000,
      salePricePara: null,
      minQuantity: 5,
      stockQuantity: 24,
      active: true,
    });
    const customer = await store.createCustomer(organization.id, {
      code: "",
      businessName: "Restoran Dunav",
      contactName: "Marko Jović",
      email: "marko@restorandunav.rs",
      phone: "0631112200",
      pib: "108765432",
      address: "Bulevar 1",
      city: "Beograd",
      notes: "",
      party: "pravna",
      paymentTermDays: 30,
      sefRegistered: false,
    });
    assert.equal(customer.code, "K-0001");
    const created = await store.createStaffOrder(organization.id, {
      customerId: customer.id,
      notes: "Pre 11 časova",
      actorName: "Ana Petrović",
      items: [{ productId: product.id, quantity: 1.5 }],
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(created.order.number.endsWith("-1001"), true);
    assert.equal(created.order.customerSnapshot.code, "K-0001");
    assert.equal(created.order.items[0]?.quantity, 1.5);
    assert.equal(created.order.totalPara, 117000);
    assert.equal(created.order.history[0]?.actorName, "Ana Petrović");
    assert.equal(created.order.paymentMethod, "racun");
  });
});

test("editing a customer keeps a blank code and rejects duplicates", async () => {
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
      name: "Mesara Pajić",
      slug: "mesara-test",
      phone: "",
    });
    const base = {
      contactName: "Ivana Stojanović",
      phone: "+381 60 444 5500",
      pib: "105432109",
      address: "Kralja Petra 22",
      city: "Kragujevac",
      notes: "",
      party: "pravna" as const,
      paymentTermDays: 15,
      sefRegistered: false,
    };
    const market = await store.createCustomer(organization.id, {
      ...base,
      code: "K-0004",
      businessName: "Market 22",
      email: "ivana@market22.rs",
    });
    const other = await store.createCustomer(organization.id, {
      ...base,
      code: "K-0001",
      businessName: "Restoran Dunav",
      contactName: "Marko Jović",
      email: "marko@restorandunav.rs",
      phone: "0631112200",
      pib: "108765432",
    });
    const updated = await store.updateCustomer(organization.id, market.id, {
      ...base,
      code: "",
      businessName: "Market 22",
      email: "ivana@market22.rs",
      phone: "+381 60 444 5599",
      notes: "Provera izmene",
    });
    assert.ok(updated);
    assert.equal(updated?.code, "K-0004");
    assert.equal(updated?.phone, "+381 60 444 5599");
    assert.equal(updated?.notes, "Provera izmene");
    await assert.rejects(
      () =>
        store.updateCustomer(organization.id, market.id, {
          ...base,
          code: other.code,
          businessName: "Market 22",
          email: "ivana@market22.rs",
        }),
      (error: unknown) => error instanceof DataError && error.message === "Ova šifra je već dodeljena drugom kupcu.",
    );
    await assert.rejects(
      () =>
        store.updateCustomer(organization.id, market.id, {
          ...base,
          code: "K-0004",
          businessName: "Market 22",
          email: "MARKO@restorandunav.rs",
        }),
      (error: unknown) => error instanceof DataError && error.message === "Kupac sa ovom email adresom već postoji.",
    );
    const kept = await store.getCustomer(organization.id, market.id);
    assert.equal(kept?.code, "K-0004");
    assert.equal(kept?.notes, "Provera izmene");
  });
});

test("orders change warehouse stock only while tracking is on", async () => {
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
      name: "Mesara Pajić",
      slug: "mesara-test",
      phone: "",
    });
    assert.equal(organization.trackStock, false);
    assert.equal(organization.efakturaEnabled, false);
    assert.equal(organization.efakturaApiKey, "");
    assert.equal(organization.efakturaEnvironment, "demo");
    const product = await store.createProduct(organization.id, {
      name: "Suva kobasica",
      sku: "MP-SKOB",
      description: "",
      categoryId: null,
      newCategory: "",
      unit: "komad",
      pricePara: 89000,
      salePricePara: null,
      minQuantity: 1,
      stockQuantity: 4,
      active: true,
    });
    const customer = await store.createCustomer(organization.id, {
      code: "",
      businessName: "Restoran Dunav",
      contactName: "Marko Jović",
      email: "marko@restorandunav.rs",
      phone: "0631112200",
      pib: "108765432",
      address: "Bulevar 1",
      city: "Beograd",
      notes: "",
      party: "pravna",
      paymentTermDays: 30,
      sefRegistered: false,
    });

    async function stock() {
      return (await store.getProduct(organization.id, product.id))?.stockQuantity;
    }

    const ignored = await store.createStaffOrder(organization.id, {
      customerId: customer.id,
      notes: "",
      actorName: "Ana Petrović",
      items: [{ productId: product.id, quantity: 1 }],
    });
    assert.equal(ignored.ok, true);
    assert.equal(await stock(), 4);

    const settings = {
      name: organization.name,
      slug: organization.slug,
      email: organization.email,
      notificationEmail: organization.notificationEmail,
      phone: organization.phone,
      address: organization.address,
      city: organization.city,
      pib: organization.pib,
      mb: organization.mb,
      logoUrl: organization.logoUrl,
      brandColor: organization.brandColor,
      coverUrl: organization.coverUrl,
      description: organization.description,
      trade: organization.trade,
      audience: organization.audience,
      publicStore: organization.publicStore,
      efakturaApiKey: "",
      efakturaEnabled: false,
      efakturaEnvironment: "demo" as const,
    };
    const enabled = await store.updateOrganization(organization.id, { ...settings, trackStock: true });
    assert.equal(enabled.trackStock, true);

    const created = await store.createStaffOrder(organization.id, {
      customerId: customer.id,
      notes: "",
      actorName: "Ana Petrović",
      items: [{ productId: product.id, quantity: 1 }],
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;
    assert.equal(await stock(), 3);
    await store.updateOrderStatus(organization.id, created.order.id, "potvrdjena", "Ana Petrović");
    await store.updateOrderStatus(organization.id, created.order.id, "u_pripremi", "Ana Petrović");
    assert.equal(await stock(), 3);
    await store.updateOrderStatus(organization.id, created.order.id, "otkazana", "Ana Petrović");
    assert.equal(await stock(), 4);
    await store.updateOrderStatus(organization.id, created.order.id, "otkazana", "Ana Petrović");
    assert.equal(await stock(), 4);

    const short = await store.createStaffOrder(organization.id, {
      customerId: customer.id,
      notes: "",
      actorName: "Ana Petrović",
      items: [{ productId: product.id, quantity: 9 }],
    });
    assert.equal(short.ok, true);
    if (!short.ok) return;
    assert.equal(await stock(), 0);
    await store.updateOrderStatus(organization.id, short.order.id, "otkazana", "Ana Petrović");
    assert.equal(await stock(), 9);

    const bought = await store.createPublicOrder(
      {
        slug: "mesara-test",
        idempotencyKey: crypto.randomUUID(),
        businessName: "Jovana Ilić",
        contactName: "Jovana Ilić",
        email: "jovana@example.rs",
        phone: "064111222",
        pib: "",
        address: "",
        city: "Beograd",
        notes: "",
        items: [{ productId: product.id, quantity: 2 }],
      },
      "127.0.0.1",
    );
    assert.equal(bought.ok, true);
    if (!bought.ok) return;
    assert.equal(await stock(), 7);

    await store.updateOrganization(organization.id, { ...settings, trackStock: false });
    await store.updateOrderStatus(organization.id, bought.order.id, "otkazana", "Ana Petrović");
    assert.equal(await stock(), 7);
  });
});

test("a new account can be restored on a database that never saw the signup", async () => {
  await withStore(async (origin) => {
    const user = await origin.createUser({
      name: "Proba Nalog",
      email: "proba@example.com",
      password: "lozinka123",
    });
    await origin.createOrganization({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      name: "Proba Veleprodaja",
      slug: "proba-veleprodaja",
      phone: "",
    });
    const carry = await origin.sessionCarry(user.id);
    if (!carry) throw new Error("Nalog nije sačuvan u sesiji.");
    assert.equal(carry.organization?.efakturaApiKey, "");
    await withStore(async (other) => {
      assert.equal(await other.resolveAccount(user.id), null);
      await other.ensureCarriedAccount(carry);
      await other.ensureCarriedAccount(carry);
      const account = await other.resolveAccount(user.id);
      assert.equal(account?.kind, "supplier");
      if (account?.kind !== "supplier") return;
      assert.equal(account.organization.name, "Proba Veleprodaja");
      const orders = await other.listOrders(account.organization.id, { pageSize: 10 });
      assert.equal(orders.items.length, 0);
      const again = await other.verifyCredentials("proba@example.com", "lozinka123");
      assert.equal(again?.id, user.id);
    });
  });
});

test("CSV import adds customers and skips an email that already exists", async () => {
  await withStore(async (store) => {
    const user = await store.createUser({
      name: "Ana Petrović",
      email: "ana@example.com",
      password: "lozinka123",
    });
    const organization = await store.createOrganization({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      name: "Proba",
      slug: "proba-csv",
      phone: "",
    });
    await store.createCustomer(organization.id, {
      code: "",
      businessName: "Pekara Zrno",
      contactName: "Marko",
      email: "pekara@example.rs",
      phone: "060111222",
      pib: "123456789",
      address: "",
      city: "Niš",
      notes: "",
      party: "pravna",
      paymentTermDays: 15,
      sefRegistered: false,
    });
    const parsed = parseCustomerCsv(
      [
        "naziv;email;telefon;vrsta",
        "Pekara Zrno;pekara@example.rs;060111222;Pravno lice",
        "Milica Radić;milica@example.rs;0694412280;Fizičko lice",
      ].join("\n"),
    );
    const result = await store.importCustomers(organization.id, parsed.rows);
    assert.equal(result.created, 1);
    assert.equal(result.errors.length, 1);
    const customers = await store.listCustomers(organization.id);
    assert.deepEqual(
      customers.map((customer) => customer.code).sort(),
      ["K-0001", "K-0002"],
    );
    assert.equal(customers.find((customer) => customer.email === "milica@example.rs")?.party, "fizicka");
  });
});

test("turning off the public store blocks the page and keeps staff orders", async () => {
  await withStore(async (store) => {
    const user = await store.createUser({
      name: "Ana Petrović",
      email: "ana@example.com",
      password: "lozinka123",
    });
    const organization = await store.createOrganization({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      name: "Proba",
      slug: "proba-rucno",
      phone: "",
    });
    assert.equal(organization.publicStore, true);
    const product = await store.createProduct(organization.id, {
      name: "Kulen",
      sku: "KUL",
      description: "",
      categoryId: null,
      newCategory: "Meso",
      unit: "kilogram",
      pricePara: 185000,
      salePricePara: null,
      minQuantity: 1,
      stockQuantity: 0,
      active: true,
    });
    const customer = await store.createCustomer(organization.id, {
      code: "",
      businessName: "Restoran Dunav",
      contactName: "Marko",
      email: "marko@example.rs",
      phone: "0631112200",
      pib: "108765432",
      address: "Bulevar 1",
      city: "Beograd",
      notes: "",
      party: "pravna",
      paymentTermDays: 15,
      sefRegistered: false,
    });
    const closed = await store.updateOrganization(organization.id, {
      name: organization.name,
      slug: organization.slug,
      email: organization.email,
      notificationEmail: organization.notificationEmail,
      phone: organization.phone,
      address: organization.address,
      city: organization.city,
      pib: organization.pib,
      mb: organization.mb,
      logoUrl: null,
      brandColor: null,
      coverUrl: null,
      description: "",
      trade: "",
      audience: organization.audience,
      trackStock: false,
      publicStore: false,
      efakturaApiKey: "",
      efakturaEnabled: false,
      efakturaEnvironment: "demo",
    });
    assert.equal(closed.publicStore, false);
    const catalog = await store.getPublicCatalog(organization.slug);
    assert.equal(catalog?.closedMessage, STORE_MANUAL_MESSAGE);
    const blocked = await store.createPublicOrder(
      {
        slug: organization.slug,
        idempotencyKey: crypto.randomUUID(),
        businessName: "Restoran Dunav",
        contactName: "Marko",
        email: "marko@example.rs",
        phone: "0631112200",
        pib: "108765432",
        address: "Bulevar 1",
        city: "Beograd",
        notes: "",
        items: [{ productId: product.id, quantity: 1 }],
      },
      "127.0.0.1",
    );
    assert.equal(blocked.ok, false);
    const entered = await store.createStaffOrder(organization.id, {
      customerId: customer.id,
      notes: "",
      actorName: "Ana Petrović",
      items: [{ productId: product.id, quantity: 1 }],
    });
    assert.equal(entered.ok, true);
  });
});

test("marketplace lists active public stores and hides a closed one", async () => {
  await withStore(async (store) => {
    const user = await store.createUser({
      name: "Ana Petrović",
      email: "ana-market@example.com",
      password: "lozinka123",
    });
    const open = await store.createOrganization({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      name: "Otvorena radnja",
      slug: "otvorena-radnja",
      phone: "",
    });
    const hiddenUser = await store.createUser({
      name: "Marko Jović",
      email: "marko-market@example.com",
      password: "lozinka123",
    });
    const hidden = await store.createOrganization({
      userId: hiddenUser.id,
      userName: hiddenUser.name,
      userEmail: hiddenUser.email,
      name: "Ručni unos",
      slug: "rucni-unos",
      phone: "",
    });
    await store.updateOrganization(hidden.id, {
      name: hidden.name,
      slug: hidden.slug,
      email: hidden.email,
      notificationEmail: hidden.notificationEmail,
      phone: hidden.phone,
      address: hidden.address,
      city: hidden.city,
      pib: hidden.pib,
      mb: hidden.mb,
      logoUrl: null,
      brandColor: null,
      coverUrl: null,
      description: "",
      trade: "",
      audience: hidden.audience,
      trackStock: false,
      publicStore: false,
      efakturaApiKey: "",
      efakturaEnabled: false,
      efakturaEnvironment: "demo",
    });
    const pausedUser = await store.createUser({
      name: "Vera Ilić",
      email: "vera-market@example.com",
      password: "lozinka123",
    });
    const paused = await store.createOrganization({
      userId: pausedUser.id,
      userName: pausedUser.name,
      userEmail: pausedUser.email,
      name: "Pauzirana",
      slug: "pauzirana",
      phone: "",
    });
    await store.setOrganizationActive(paused.id, false);
    await store.createProduct(open.id, {
      name: "Brašno",
      sku: "BR",
      description: "",
      categoryId: null,
      newCategory: "Meso",
      unit: "kilogram",
      pricePara: 10000,
      salePricePara: null,
      minQuantity: 1,
      stockQuantity: 0,
      active: true,
    });
    const listed = await store.listMarketplaceStores();
    assert.deepEqual(
      listed.map((item) => item.slug),
      ["otvorena-radnja"],
    );
    assert.equal(listed[0]?.name, "Otvorena radnja");
    assert.equal(listed[0]?.trade, "");
    assert.equal(listed[0]?.productCount, 1);
  });
});
