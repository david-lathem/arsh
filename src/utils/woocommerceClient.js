const axios = require("axios");

const storeUrl = process.env.WC_STORE_URL;
const consumerKey = process.env.WC_CONSUMER_KEY;
const consumerSecret = process.env.WC_CONSUMER_SECRET;

if (!storeUrl || !consumerKey || !consumerSecret) {
  console.warn(
    "WooCommerce credentials (WC_STORE_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET) not fully set in env."
  );
}

const api = axios.create({
  baseURL: `${storeUrl.replace(/\/$/, "")}/wp-json/wc/v3`,
  timeout: 15000,
  params: {
    consumer_key: consumerKey,
    consumer_secret: consumerSecret,
  },
});

async function fetchRecentOrders(per_page = 20) {
  // returns newest orders (by date), desc
  const res = await api.get("/orders", {
    params: {
      per_page,
      orderby: "date",
      order: "desc",
    },
  });
  return res.data;
}

async function getOrder(orderId) {
  const res = await api.get(`/orders/${orderId}`);
  return res.data;
}

async function updateOrderStatus(orderId, payload) {
  // payload example: { status: "processing" } or meta_data changes
  const res = await api.put(`/orders/${orderId}`, payload);
  return res.data;
}

async function fetchAllProducts(per_page = 100) {
  let allProducts = [];
  let page = 1;

  while (true) {
    const res = await api.get("/products", {
      params: {
        per_page,
        page,
        status: "publish",
      },
    });

    console.log(`Page ${page} headers:`, res.headers);

    const products = res.data;
    allProducts = allProducts.concat(products);

    // Stop if fewer than per_page items returned
    if (products.length < per_page) break;

    page++;
  }

  return allProducts;
}

module.exports = {
  fetchRecentOrders,
  getOrder,
  updateOrderStatus,
  fetchAllProducts,
};
