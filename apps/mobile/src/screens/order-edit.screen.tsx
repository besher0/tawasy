import React from "react";
import { RouteProp, useRoute } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { NewOrderScreen } from "./new-order.screen";

type ScreenRoute = RouteProp<RootStackParamList, "EditOrder">;

export function OrderEditScreen() {
  const route = useRoute<ScreenRoute>();

  return <NewOrderScreen orderId={route.params.orderId} />;
}
