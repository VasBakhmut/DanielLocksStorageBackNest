import { Controller, Get } from "@nestjs/common";
import { products } from "./knowledge";

@Controller("products")
export class ProductsController {
  @Get()
  list() {
    return products;
  }
}
