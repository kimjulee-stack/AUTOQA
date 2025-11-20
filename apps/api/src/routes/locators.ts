import { Router } from "express";

import { getLocatorTemplates, getScreensByProduct } from "../data/locatorTemplates.js";

const router = Router();

router.get("/templates", (req, res) => {
  const { product, screen } = req.query;

  if (!product || typeof product !== "string") {
    return res.status(400).json({ message: "제품명이 필요합니다." });
  }

  const templates = getLocatorTemplates(product, screen as string | undefined);
  res.json(templates);
});

router.get("/screens", (req, res) => {
  const { product } = req.query;

  if (!product || typeof product !== "string") {
    return res.status(400).json({ message: "제품명이 필요합니다." });
  }

  const screens = getScreensByProduct(product);
  res.json(screens);
});

export default router;






