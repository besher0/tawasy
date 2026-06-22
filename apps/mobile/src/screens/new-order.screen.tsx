import {
  CakeFinish,
  CakeShape,
  MoldFlavor,
  MoldInnerColor,
  OrderItemKind,
  PaymentStatus,
  ShopType,
  UserRole,
} from "@sugarprecision/shared-types";
import type {
  CreateOrderInput,
  ShopSummary,
} from "@sugarprecision/shared-types";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DeliveryDatePicker,
  DeliveryTimePicker,
  formatDeliveryDate,
  formatDeliveryTime,
} from "../components/delivery-date-time-picker";
import { useAuth } from "../context/auth-context";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/api-error";
import { RootStackParamList } from "../navigation/types";
import theme from "../theme";

type DraftOrderItem = {
  id: string;
  itemKind: OrderItemKind;
  pieceType: string;
  hasTopDecoration: boolean;
  layers: number;
  shape: CakeShape;
  moldFlavor: MoldFlavor;
  moldInnerColor: MoldInnerColor;
  moldLayerColors: string;
  moldColor: string;
  hasFillings: boolean;
  filling: string;
  withFoam: boolean;
  foamCount: number;
  finishType: CakeFinish;
  peopleCount: number;
  specialDetails: string;
  writingText: string;
  referenceImages: string[];
};

type Choice<T extends string> = {
  value: T;
  label: string;
};

type CreatedOrder = {
  id: string;
  orderNumber: string;
};

type NewOrderScreenProps = {
  orderId?: string;
};

let orderItemCounter = 0;

const shopScopedRoles = new Set<UserRole>([
  UserRole.SHOP_MANAGER,
  UserRole.SHOP_EMPLOYEE,
]);

const maxReferenceImageBytes = 15 * 1024 * 1024;
const maxReferenceImageMb = Math.round(maxReferenceImageBytes / 1024 / 1024);

const itemKindOptions: Choice<OrderItemKind>[] = [
  { value: OrderItemKind.PIECES, label: "قطع" },
  { value: OrderItemKind.MOLD, label: "قالب" },
];

const yesNoOptions: Choice<"yes" | "no">[] = [
  { value: "yes", label: "نعم" },
  { value: "no", label: "لا" },
];

const moldFlavorOptions: Choice<MoldFlavor>[] = [
  { value: MoldFlavor.CREAM, label: "كريمة" },
  { value: MoldFlavor.CHOCOLATE, label: "شوكولا" },
  { value: MoldFlavor.HARISSA, label: "هريسة" },
];

const moldInnerColorOptions: Choice<MoldInnerColor>[] = [
  { value: MoldInnerColor.WHITE, label: "أبيض" },
  { value: MoldInnerColor.BLACK, label: "أسود" },
  { value: MoldInnerColor.MIXED, label: "مشكل" },
];

const cakeShapeOptions: Choice<CakeShape>[] = [
  { value: CakeShape.ROUND, label: "مدور" },
  { value: CakeShape.SQUARE, label: "مربع" },
  { value: CakeShape.HEART, label: "قلب" },
];

const layerOptions: Choice<"1" | "2" | "3" | "4">[] = [
  { value: "1", label: "طابق واحد" },
  { value: "2", label: "طابقين" },
  { value: "3", label: "3 طوابق" },
  { value: "4", label: "4 طوابق" },
];

const finishOptions: Choice<CakeFinish>[] = [
  { value: CakeFinish.NONE, label: "ما في" },
  { value: CakeFinish.DISK_ENLARGEMENT, label: "تكبير ديسك" },
  { value: CakeFinish.COVERING, label: "تلبيس" },
];

function buildDefaultDelivery() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(16, 0, 0, 0);

  return {
    deliveryDate: date.toISOString().slice(0, 10),
    deliveryTime: date.toTimeString().slice(0, 5),
  };
}

function createEmptyItem(): DraftOrderItem {
  orderItemCounter += 1;

  return {
    id: `item-${Date.now()}-${orderItemCounter}`,
    itemKind: OrderItemKind.MOLD,
    pieceType: "",
    hasTopDecoration: false,
    layers: 1,
    shape: CakeShape.ROUND,
    moldFlavor: MoldFlavor.CREAM,
    moldInnerColor: MoldInnerColor.WHITE,
    moldLayerColors: "",
    moldColor: "",
    hasFillings: false,
    filling: "",
    withFoam: false,
    foamCount: 1,
    finishType: CakeFinish.NONE,
    peopleCount: 1,
    specialDetails: "",
    writingText: "",
    referenceImages: [],
  };
}

function getLocalDeliveryParts(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return buildDefaultDelivery();
  }

  const deliveryDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  const deliveryTime = [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");

  return { deliveryDate, deliveryTime };
}

function toDraftOrderItem(item: any): DraftOrderItem {
  const empty = createEmptyItem();

  return {
    ...empty,
    id: item.id ?? empty.id,
    itemKind: item.itemKind ?? empty.itemKind,
    pieceType: item.pieceType ?? "",
    hasTopDecoration: Boolean(item.hasTopDecoration),
    layers: Number.isFinite(item.layers) ? item.layers : empty.layers,
    shape: item.shape ?? empty.shape,
    moldFlavor: item.moldFlavor ?? empty.moldFlavor,
    moldInnerColor: item.moldInnerColor ?? empty.moldInnerColor,
    moldLayerColors: item.moldLayerColors ?? "",
    moldColor: item.moldColor ?? "",
    hasFillings: Boolean(item.hasFillings),
    filling: item.filling ?? "",
    withFoam: Boolean(item.withFoam),
    foamCount: Number.isFinite(item.foamCount)
      ? item.foamCount
      : empty.foamCount,
    finishType: item.finishType ?? empty.finishType,
    peopleCount: Number.isFinite(item.peopleCount)
      ? item.peopleCount
      : empty.peopleCount,
    specialDetails: item.specialDetails ?? "",
    writingText: item.writingText ?? "",
    referenceImages: Array.isArray(item.referenceImages)
      ? item.referenceImages
      : [],
  };
}

function ChoiceRow<T extends string>({
  options,
  selected,
  onSelect,
  large = false,
}: {
  options: Choice<T>[];
  selected: T;
  onSelect: (value: T) => void;
  large?: boolean;
}) {
  return (
    <View style={styles.optionRow}>
      {options.map((option) => {
        const active = selected === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionChip,
              large ? styles.optionChipLarge : null,
              active ? styles.optionChipActive : null,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.optionChipText,
                active ? styles.optionChipTextActive : null,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function NewOrderScreen({ orderId }: NewOrderScreenProps) {
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const defaults = useMemo(() => buildDefaultDelivery(), []);
  const isEditing = Boolean(orderId);
  const isShopScoped = user?.role ? shopScopedRoles.has(user.role) : false;

  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [shopId, setShopId] = useState("");
  const [deliveryShopId, setDeliveryShopId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(defaults.deliveryDate);
  const [deliveryTime, setDeliveryTime] = useState(defaults.deliveryTime);
  const [activeDeliveryPicker, setActiveDeliveryPicker] = useState<
    "date" | "time" | null
  >(null);
  const [totalPrice, setTotalPrice] = useState("1250");
  const [depositAmount, setDepositAmount] = useState("500");
  const [notes, setNotes] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [items, setItems] = useState<DraftOrderItem[]>(() => [
    createEmptyItem(),
  ]);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [shopsError, setShopsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [orderLoading, setOrderLoading] = useState(isEditing);
  const [orderLoadError, setOrderLoadError] = useState<string | null>(null);

  const loadShops = useCallback(async () => {
    try {
      setShopsLoading(true);
      setShopsError(null);
      const response = await api.get<ShopSummary[]>("/shops");
      const locations = response.data ?? [];
      const branches = locations.filter(
        (shop) => shop.type === ShopType.BRANCH,
      );
      const userShop = user?.shopId
        ? locations.find((shop) => shop.id === user.shopId)
        : undefined;
      const defaultOrderShopId = userShop?.id ?? branches[0]?.id ?? "";
      const defaultDeliveryShopId = userShop?.id ?? locations[0]?.id ?? "";

      setShops(locations);
      setShopId((current) => current || defaultOrderShopId);
      setDeliveryShopId((current) => current || defaultDeliveryShopId);
    } catch (error) {
      setShopsError(
        getApiErrorMessage(error, "تعذر تحميل الفروع والمعمل. حاول مرة أخرى."),
      );
    } finally {
      setShopsLoading(false);
    }
  }, [user?.shopId]);

  useEffect(() => {
    void loadShops();
  }, [loadShops]);

  const loadOrderForEditing = useCallback(async () => {
    if (!orderId) {
      return;
    }

    try {
      setOrderLoading(true);
      setOrderLoadError(null);
      const response = await api.get(`/orders/${orderId}`);
      const order = response.data;
      const delivery = getLocalDeliveryParts(order.deliveryDatetime);

      setShopId(order.shopId ?? "");
      setDeliveryShopId(order.moldDeliveryShopId ?? "");
      setCustomerName(order.customerName ?? "");
      setCustomerPhone(order.customerPhone ?? "");
      setDeliveryDate(delivery.deliveryDate);
      setDeliveryTime(delivery.deliveryTime);
      setTotalPrice(String(order.totalPrice ?? ""));
      setDepositAmount(String(order.depositAmount ?? ""));
      setNotes(order.notes ?? "");
      setIsUrgent(Boolean(order.isUrgent));
      setItems(
        Array.isArray(order.items) && order.items.length
          ? order.items.map(toDraftOrderItem)
          : [createEmptyItem()],
      );
    } catch (error) {
      setOrderLoadError(
        getApiErrorMessage(error, "تعذر تحميل الطلب للتعديل. حاول مرة أخرى."),
      );
    } finally {
      setOrderLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrderForEditing();
  }, [loadOrderForEditing]);

  const branches = useMemo(
    () => shops.filter((shop) => shop.type === ShopType.BRANCH),
    [shops],
  );

  const accountShop = useMemo(() => {
    if (!user?.shopId) {
      return undefined;
    }

    return shops.find((shop) => shop.id === user.shopId);
  }, [shops, user?.shopId]);

  const orderBranchId = isShopScoped ? (accountShop?.id ?? "") : shopId;

  const remainingAmount = useMemo(() => {
    const total = Number(totalPrice);
    const deposit = Number(depositAmount);

    if (!Number.isFinite(total) || !Number.isFinite(deposit)) {
      return 0;
    }

    return Math.max(total - deposit, 0);
  }, [depositAmount, totalPrice]);

  const updateItem = (
    itemId: string,
    updater: (item: DraftOrderItem) => DraftOrderItem,
  ) => {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? updater(item) : item)),
    );
  };

  const pickImages = async (itemId: string) => {
    if (uploadingItemId) {
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 0,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const oversizedAsset = result.assets.find((asset) => {
        const size = asset.fileSize ?? asset.file?.size;
        return typeof size === "number" && size > maxReferenceImageBytes;
      });

      if (oversizedAsset) {
        Alert.alert(
          "تنبيه",
          `حجم إحدى الصور أكبر من ${maxReferenceImageMb} ميغابايت. اختر صورة أصغر أو خفّض حجمها ثم حاول مجدداً.`,
        );
        return;
      }

      setUploadingItemId(itemId);
      const uploadedUrls: string[] = [];

      for (const asset of result.assets) {
        const form = new FormData();
        const fileName = asset.fileName ?? `reference-${Date.now()}.jpg`;

        if (Platform.OS === "web") {
          const webFile =
            asset.file ??
            new File([await (await fetch(asset.uri)).blob()], fileName, {
              type: asset.mimeType ?? "image/jpeg",
            });
          form.append("file", webFile, fileName);
        } else {
          form.append("file", {
            uri: asset.uri,
            name: fileName,
            type: asset.mimeType ?? "image/jpeg",
          } as never);
        }

        const response = await api.post<{ url: string }>(
          "/uploads/order-reference",
          form,
          {
            headers:
              Platform.OS === "web"
                ? undefined
                : { "Content-Type": "multipart/form-data" },
            transformRequest: (data) => data,
          },
        );
        uploadedUrls.push(response.data.url as string);
      }

      updateItem(itemId, (item) => ({
        ...item,
        referenceImages: [...item.referenceImages, ...uploadedUrls],
      }));
    } catch (error) {
      Alert.alert(
        "خطأ",
        getApiErrorMessage(
          error,
          `تعذر رفع الصور المرجعية. حاول بصورة أصغر من ${maxReferenceImageMb} ميغابايت.`,
        ),
      );
    } finally {
      setUploadingItemId(null);
    }
  };

  const removeImage = (itemId: string, imageIndex: number) => {
    updateItem(itemId, (item) => ({
      ...item,
      referenceImages: item.referenceImages.filter(
        (_, index) => index !== imageIndex,
      ),
    }));
  };

  const resetForm = () => {
    const fallbackOrderShopId = accountShop?.id ?? branches[0]?.id ?? "";
    const fallbackDeliveryShopId = accountShop?.id ?? shops[0]?.id ?? "";

    setShopId(fallbackOrderShopId);
    setDeliveryShopId(fallbackDeliveryShopId);
    setCustomerName("");
    setCustomerPhone("");
    setTotalPrice("1250");
    setDepositAmount("500");
    setNotes("");
    setIsUrgent(false);
    setItems([createEmptyItem()]);
    setDeliveryDate(defaults.deliveryDate);
    setDeliveryTime(defaults.deliveryTime);
  };

  const validateItems = () => {
    const invalidPieceIndex = items.findIndex(
      (item) =>
        item.itemKind === OrderItemKind.PIECES && !item.pieceType.trim(),
    );

    if (invalidPieceIndex >= 0) {
      setSubmitError(`حدد نوع القطع في المنتج رقم ${invalidPieceIndex + 1}`);
      return false;
    }

    const invalidMoldColorIndex = items.findIndex(
      (item) => item.itemKind === OrderItemKind.MOLD && !item.moldColor.trim(),
    );

    if (invalidMoldColorIndex >= 0) {
      setSubmitError(
        `اكتب اللون الخارجي للقالب رقم ${invalidMoldColorIndex + 1}`,
      );
      return false;
    }

    const invalidFillingIndex = items.findIndex(
      (item) =>
        item.itemKind === OrderItemKind.MOLD &&
        item.hasFillings &&
        !item.filling.trim(),
    );

    if (invalidFillingIndex >= 0) {
      setSubmitError(`اكتب الحشوات في القالب رقم ${invalidFillingIndex + 1}`);
      return false;
    }

    return true;
  };

  const submit = async () => {
    if (isSubmitting) {
      return;
    }

    setSubmitError(null);
    setCreatedOrder(null);

    if (!validateItems()) {
      return;
    }

    if (shopsLoading) {
      setSubmitError("انتظر قليلاً حتى يكتمل تحميل الفروع والمعمل.");
      return;
    }

    if (shopsError) {
      setSubmitError("تعذر تحميل الفروع والمعمل. اضغط إعادة المحاولة.");
      return;
    }

    if (!orderBranchId.trim()) {
      setSubmitError("لا يوجد فرع مربوط بالحساب أو محدد للطلب.");
      return;
    }

    if (!deliveryShopId.trim()) {
      setSubmitError("اختر مكان التسليم.");
      return;
    }

    if (!customerName.trim()) {
      setSubmitError("أدخل اسم الزبون.");
      return;
    }

    if (!customerPhone.trim()) {
      setSubmitError("أدخل رقم الهاتف.");
      return;
    }

    const delivery = new Date(`${deliveryDate}T${deliveryTime}:00`);
    if (Number.isNaN(delivery.getTime())) {
      setSubmitError("تاريخ أو وقت التسليم غير صالح.");
      return;
    }

    const normalizedTotal = Number(totalPrice);
    const normalizedDeposit = Number(depositAmount);

    if (!Number.isFinite(normalizedTotal) || normalizedTotal < 0) {
      setSubmitError("الإجمالي غير صحيح.");
      return;
    }

    if (!Number.isFinite(normalizedDeposit) || normalizedDeposit < 0) {
      setSubmitError("العربون غير صحيح.");
      return;
    }

    if (normalizedDeposit > normalizedTotal) {
      setSubmitError("العربون لا يمكن أن يتجاوز الإجمالي.");
      return;
    }

    const missingMixedLayerColors = items.find(
      (item) =>
        item.itemKind === OrderItemKind.MOLD &&
        item.moldInnerColor === MoldInnerColor.MIXED &&
        !item.moldLayerColors.trim(),
    );

    if (missingMixedLayerColors) {
      setSubmitError("حدد ألوان الطبقات عندما يكون لون القالب من الداخل مشكل.");
      return;
    }

    const paymentStatus =
      normalizedDeposit <= 0
        ? PaymentStatus.UNPAID
        : normalizedDeposit >= normalizedTotal
          ? PaymentStatus.PAID
          : PaymentStatus.PARTIAL;

    const payload: CreateOrderInput = {
      moldDeliveryShopId: deliveryShopId.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryDatetime: delivery.toISOString(),
      totalPrice: normalizedTotal,
      depositAmount: normalizedDeposit,
      paymentStatus,
      isUrgent,
      notes: notes.trim() || undefined,
      items: items.map((item) => {
        const isMold = item.itemKind === OrderItemKind.MOLD;

        return {
          itemKind: item.itemKind,
          pieceType: isMold ? undefined : item.pieceType.trim(),
          hasTopDecoration: isMold ? false : item.hasTopDecoration,
          layers: item.layers,
          shape: isMold ? item.shape : undefined,
          moldFlavor: isMold ? item.moldFlavor : undefined,
          moldInnerColor: isMold ? item.moldInnerColor : undefined,
          moldLayerColors:
            isMold && item.moldInnerColor === MoldInnerColor.MIXED
              ? item.moldLayerColors.trim()
              : undefined,
          moldColor: isMold ? item.moldColor.trim() : undefined,
          hasFillings: isMold && item.hasFillings,
          filling: isMold && item.hasFillings ? item.filling.trim() : undefined,
          withFoam: isMold && item.withFoam,
          foamCount: isMold && item.withFoam ? item.foamCount : undefined,
          finishType: isMold ? item.finishType : CakeFinish.NONE,
          peopleCount: item.peopleCount,
          specialDetails: item.specialDetails.trim() || undefined,
          writingText: isMold
            ? item.writingText.trim() || undefined
            : undefined,
          referenceImages: item.referenceImages,
        };
      }),
    };

    if (!isShopScoped) {
      payload.shopId = orderBranchId.trim();
    }

    try {
      setIsSubmitting(true);
      if (isEditing && orderId) {
        await api.patch(`/orders/${orderId}`, payload);
        navigation.goBack();
      } else {
        const response = await api.post<{ id: string; orderNumber: string }>(
          "/orders",
          payload,
        );
        resetForm();
        setCreatedOrder(response.data);
      }
    } catch (error) {
      setSubmitError(
        getApiErrorMessage(
          error,
          "فشل إرسال الطلب. تحقق من البيانات ومكان التسليم.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderShopSelector = (
    label: string,
    selectedId: string,
    options: ShopSummary[],
    onSelect: (id: string) => void,
    helperText?: string,
  ) => (
    <View style={styles.selectorBlock}>
      <Text style={styles.label}>{label}</Text>
      {helperText ? <Text style={styles.note}>{helperText}</Text> : null}
      <View style={styles.optionRow}>
        {shopsLoading ? (
          <Text style={styles.note}>جاري تحميل الفروع والمعمل...</Text>
        ) : shopsError ? (
          <View style={styles.inlineMessage}>
            <Text style={styles.errorText}>{shopsError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void loadShops()}
            >
              <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        ) : options.length ? (
          options.map((shop) => {
            const active = selectedId === shop.id;
            const locationType =
              shop.type === ShopType.FACTORY ? "المعمل" : "فرع";

            return (
              <TouchableOpacity
                key={shop.id}
                style={[styles.shopChip, active ? styles.shopChipActive : null]}
                onPress={() => onSelect(shop.id)}
              >
                <Text
                  style={[
                    styles.shopChipTitle,
                    active ? styles.shopChipTitleActive : null,
                  ]}
                >
                  {shop.name}
                </Text>
                <Text
                  style={[
                    styles.shopChipLocation,
                    active ? styles.shopChipLocationActive : null,
                  ]}
                >
                  {locationType} - {shop.location}
                </Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.emptyText}>لا توجد مواقع متاحة حالياً</Text>
        )}
      </View>
    </View>
  );

  const renderStepper = (value: number, onChange: (value: number) => void) => (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={styles.stepperButton}
        onPress={() => onChange(Math.max(1, value - 1))}
      >
        <Text style={styles.stepperButtonText}>-</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.stepperValue}
        value={String(value)}
        keyboardType="numeric"
        onChangeText={(text) => {
          const nextValue = Number(text);
          if (Number.isFinite(nextValue)) {
            onChange(Math.max(1, Math.floor(nextValue)));
          }
        }}
        textAlign="center"
      />
      <TouchableOpacity
        style={styles.stepperButton}
        onPress={() => onChange(value + 1)}
      >
        <Text style={styles.stepperButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  if (isEditing && orderLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.note}>جاري تحميل الطلب للتعديل...</Text>
      </View>
    );
  }

  if (isEditing && orderLoadError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{orderLoadError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => void loadOrderForEditing()}
        >
          <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.pageHeader}>
        <Text style={styles.heading}>
          {isEditing ? "تعديل الطلب" : "إنشاء طلب جديد"}
        </Text>
        <Text style={styles.pageHint}>
          {isEditing
            ? "يمكنك تعديل المنتجات والتفاصيل. سيبقى الطلب في مرحلته الحالية."
            : "ابدأ بتحديد نوع كل منتج ثم أكمل بيانات الزبون والدفع."}
        </Text>
      </View>

      {items.map((item, index) => {
        const isMold = item.itemKind === OrderItemKind.MOLD;

        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.itemHeader}>
              <Text style={styles.sectionTitle}>{`المنتج #${index + 1}`}</Text>
              {items.length > 1 ? (
                <TouchableOpacity
                  onPress={() =>
                    setItems((current) =>
                      current.filter((entry) => entry.id !== item.id),
                    )
                  }
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>حذف</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.primaryLabel}>نوع الطلب</Text>
            <ChoiceRow
              options={itemKindOptions}
              selected={item.itemKind}
              large
              onSelect={(itemKind) =>
                updateItem(item.id, (current) => ({ ...current, itemKind }))
              }
            />

            {!isMold ? (
              <>
                <Text style={styles.label}>عدد القطع</Text>
                {renderStepper(item.peopleCount, (peopleCount) =>
                  updateItem(item.id, (current) => ({
                    ...current,
                    peopleCount,
                  })),
                )}

                <Text style={styles.label}>نوع القطع</Text>
                <TextInput
                  style={styles.input}
                  value={item.pieceType}
                  onChangeText={(pieceType) =>
                    updateItem(item.id, (current) => ({
                      ...current,
                      pieceType,
                    }))
                  }
                  placeholder="مثال: كب كيك، إكلير، قطع كيك..."
                  textAlign="right"
                />

                <Text style={styles.label}>عدد الطبقات</Text>
                {renderStepper(item.layers, (layers) =>
                  updateItem(item.id, (current) => ({ ...current, layers })),
                )}

                <Text style={styles.label}>هل يوجد شيء فوق القطع؟</Text>
                <ChoiceRow
                  options={yesNoOptions}
                  selected={item.hasTopDecoration ? "yes" : "no"}
                  onSelect={(value) =>
                    updateItem(item.id, (current) => ({
                      ...current,
                      hasTopDecoration: value === "yes",
                    }))
                  }
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>عدد الأشخاص</Text>
                {renderStepper(item.peopleCount, (peopleCount) =>
                  updateItem(item.id, (current) => ({
                    ...current,
                    peopleCount,
                  })),
                )}

                <Text style={styles.label}>لون القالب من الداخل</Text>
                <ChoiceRow
                  options={moldInnerColorOptions}
                  selected={item.moldInnerColor}
                  onSelect={(moldInnerColor) =>
                    updateItem(item.id, (current) => ({
                      ...current,
                      moldInnerColor,
                      moldLayerColors:
                        moldInnerColor === MoldInnerColor.MIXED
                          ? current.moldLayerColors
                          : "",
                    }))
                  }
                />

                {item.moldInnerColor === MoldInnerColor.MIXED ? (
                  <>
                    <Text style={styles.label}>ألوان الطبقات الموجودة</Text>
                    <TextInput
                      style={styles.input}
                      value={item.moldLayerColors}
                      onChangeText={(moldLayerColors) =>
                        updateItem(item.id, (current) => ({
                          ...current,
                          moldLayerColors,
                        }))
                      }
                      placeholder="مثال: الأول أبيض، الثاني شوكولا"
                      textAlign="right"
                    />
                  </>
                ) : null}

                <Text style={styles.label}>نوع القالب</Text>
                <ChoiceRow
                  options={moldFlavorOptions}
                  selected={item.moldFlavor}
                  onSelect={(moldFlavor) =>
                    updateItem(item.id, (current) => ({
                      ...current,
                      moldFlavor,
                    }))
                  }
                />

                <Text style={styles.label}>اللون الخارجي للقالب</Text>
                <TextInput
                  style={styles.input}
                  value={item.moldColor}
                  onChangeText={(moldColor) =>
                    updateItem(item.id, (current) => ({
                      ...current,
                      moldColor,
                    }))
                  }
                  placeholder="مثال: أبيض، زهري، أزرق سماوي..."
                  textAlign="right"
                />

                <Text style={styles.label}>هل يوجد حشوات؟</Text>
                <ChoiceRow
                  options={yesNoOptions}
                  selected={item.hasFillings ? "yes" : "no"}
                  onSelect={(value) =>
                    updateItem(item.id, (current) => ({
                      ...current,
                      hasFillings: value === "yes",
                      filling: value === "yes" ? current.filling : "",
                    }))
                  }
                />

                {item.hasFillings ? (
                  <TextInput
                    style={styles.input}
                    value={item.filling}
                    onChangeText={(filling) =>
                      updateItem(item.id, (current) => ({
                        ...current,
                        filling,
                      }))
                    }
                    placeholder="اكتب أنواع الحشوات"
                    textAlign="right"
                  />
                ) : null}

                <Text style={styles.label}>شكل القالب</Text>
                <ChoiceRow
                  options={cakeShapeOptions}
                  selected={item.shape}
                  onSelect={(shape) =>
                    updateItem(item.id, (current) => ({ ...current, shape }))
                  }
                />

                <Text style={styles.label}>الفلين</Text>
                <ChoiceRow
                  options={[
                    { value: "yes", label: "مع فلين" },
                    { value: "no", label: "بدون فلين" },
                  ]}
                  selected={item.withFoam ? "yes" : "no"}
                  onSelect={(value) =>
                    updateItem(item.id, (current) => ({
                      ...current,
                      withFoam: value === "yes",
                      foamCount: value === "yes" ? current.foamCount : 1,
                    }))
                  }
                />

                {item.withFoam ? (
                  <>
                    <Text style={styles.label}>عدد الفلين</Text>
                    {renderStepper(item.foamCount, (foamCount) =>
                      updateItem(item.id, (current) => ({
                        ...current,
                        foamCount,
                      })),
                    )}
                  </>
                ) : null}

                <Text style={styles.label}>عدد الطوابق</Text>
                <ChoiceRow
                  options={layerOptions}
                  selected={
                    ["1", "2", "3", "4"].includes(String(item.layers))
                      ? (String(item.layers) as "1" | "2" | "3" | "4")
                      : "1"
                  }
                  onSelect={(value) =>
                    updateItem(item.id, (current) => ({
                      ...current,
                      layers: Number(value),
                    }))
                  }
                />

                <Text style={styles.label}>التجهيز الخارجي</Text>
                <ChoiceRow
                  options={finishOptions}
                  selected={item.finishType}
                  onSelect={(finishType) =>
                    updateItem(item.id, (current) => ({
                      ...current,
                      finishType,
                    }))
                  }
                />

                <Text style={styles.label}>الكتابة الخاصة بالقالب</Text>
                <TextInput
                  style={styles.input}
                  value={item.writingText}
                  onChangeText={(writingText) =>
                    updateItem(item.id, (current) => ({
                      ...current,
                      writingText,
                    }))
                  }
                  placeholder="اكتب النص المطلوب على القالب، أو اتركه فارغاً"
                  textAlign="right"
                />
              </>
            )}

            <Text style={styles.label}>الملاحظات والإضافات الأخرى</Text>
            <TextInput
              style={styles.textArea}
              value={item.specialDetails}
              onChangeText={(specialDetails) =>
                updateItem(item.id, (current) => ({
                  ...current,
                  specialDetails,
                }))
              }
              placeholder="اكتب أي تفاصيل إضافية أو تعليمات خاصة..."
              multiline
              textAlign="right"
              textAlignVertical="top"
            />

            <Text style={styles.label}>الصور المرجعية</Text>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                uploadingItemId === item.id
                  ? styles.uploadButtonDisabled
                  : null,
              ]}
              disabled={uploadingItemId !== null}
              onPress={() => void pickImages(item.id)}
            >
              <Text style={styles.uploadButtonText}>
                {uploadingItemId === item.id
                  ? "جاري رفع الصور..."
                  : "رفع صورة أو عدة صور"}
              </Text>
            </TouchableOpacity>

            {item.referenceImages.length ? (
              <View style={styles.imageGrid}>
                {item.referenceImages.map((imageUrl, imageIndex) => (
                  <View
                    key={`${imageUrl}-${imageIndex}`}
                    style={styles.imageCard}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.referenceImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(item.id, imageIndex)}
                    >
                      <Text style={styles.removeImageText}>حذف</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.note}>لم تتم إضافة صور بعد</Text>
            )}
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setItems((current) => [...current, createEmptyItem()])}
      >
        <Text style={styles.addButtonText}>إضافة منتج آخر للطلب</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>بيانات الزبون والاستلام</Text>

        {isShopScoped ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>فرع تسجيل الطلب</Text>
            <Text style={styles.infoValue}>
              {accountShop?.name ?? "فرع الحساب الحالي"}
            </Text>
          </View>
        ) : (
          renderShopSelector(
            "فرع تسجيل الطلب",
            shopId,
            branches,
            setShopId,
            "هذا هو الفرع الذي تم تسجيل الطلب لصالحه.",
          )
        )}

        {renderShopSelector(
          "مكان التسليم",
          deliveryShopId,
          shops,
          setDeliveryShopId,
          "يمكن اختيار أي فرع أو التسليم مباشرة في المعمل.",
        )}

        <Text style={styles.label}>اسم الزبون</Text>
        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={setCustomerName}
          textAlign="right"
        />

        <Text style={styles.label}>رقم الهاتف</Text>
        <TextInput
          style={styles.input}
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
          textAlign="right"
        />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>وقت التسليم</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.dateTimeField}
              onPress={() => setActiveDeliveryPicker("time")}
            >
              <Text style={styles.dateTimeValue}>
                {formatDeliveryTime(deliveryTime)}
              </Text>
              <Text style={styles.dateTimeHint}>اضغط لاختيار الوقت</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>تاريخ التسليم</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.dateTimeField}
              onPress={() => setActiveDeliveryPicker("date")}
            >
              <Text style={styles.dateTimeValue}>
                {formatDeliveryDate(deliveryDate)}
              </Text>
              <Text style={styles.dateTimeHint}>اضغط لفتح التقويم</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.urgentButton,
            isUrgent ? styles.urgentButtonActive : null,
          ]}
          onPress={() => setIsUrgent((current) => !current)}
        >
          <Text
            style={[
              styles.urgentButtonText,
              isUrgent ? styles.urgentButtonTextActive : null,
            ]}
          >
            {isUrgent ? "الطلب مستعجل" : "الطلب عادي"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>الحساب والمدفوعات</Text>

        <Text style={styles.label}>الإجمالي</Text>
        <TextInput
          style={styles.input}
          value={totalPrice}
          onChangeText={setTotalPrice}
          keyboardType="numeric"
          textAlign="right"
        />

        <Text style={styles.label}>العربون</Text>
        <TextInput
          style={styles.input}
          value={depositAmount}
          onChangeText={setDepositAmount}
          keyboardType="numeric"
          textAlign="right"
        />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryTitle}>المتبقي</Text>
          <Text style={styles.summaryValue}>
            {remainingAmount.toFixed(2)} ر.س
          </Text>
        </View>

        <Text style={styles.label}>ملاحظات الطلب العامة</Text>
        <TextInput
          style={styles.textArea}
          value={notes}
          onChangeText={setNotes}
          placeholder="أي ملاحظات عامة على كامل الطلب..."
          multiline
          textAlign="right"
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            isSubmitting || shopsLoading ? styles.primaryButtonDisabled : null,
          ]}
          onPress={() => void submit()}
          disabled={isSubmitting || shopsLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting
              ? isEditing
                ? "جاري حفظ التعديلات..."
                : "جاري إرسال الطلب..."
              : isEditing
                ? "حفظ تعديلات الطلب"
                : "إرسال الطلب للمعمل"}
          </Text>
        </TouchableOpacity>

        {submitError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{submitError}</Text>
          </View>
        ) : null}

        {!isEditing && createdOrder ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>تمت إضافة الطلب بنجاح</Text>
            <Text style={styles.successText}>
              رقم الطلب: {createdOrder.orderNumber}
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() =>
                navigation.navigate("OrderDetails", {
                  orderId: createdOrder.id,
                })
              }
            >
              <Text style={styles.successButtonText}>عرض تفاصيل الطلب</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <DeliveryDatePicker
        visible={activeDeliveryPicker === "date"}
        value={deliveryDate}
        onClose={() => setActiveDeliveryPicker(null)}
        onConfirm={(value) => {
          setDeliveryDate(value);
          setActiveDeliveryPicker(null);
        }}
      />

      <DeliveryTimePicker
        visible={activeDeliveryPicker === "time"}
        value={deliveryTime}
        onClose={() => setActiveDeliveryPicker(null)}
        onConfirm={(value) => {
          setDeliveryTime(value);
          setActiveDeliveryPicker(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  content: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  pageHeader: {
    gap: theme.spacing.xs,
  },
  heading: {
    ...theme.typography.heading,
    color: theme.colors.onSurface,
    textAlign: "right",
  },
  pageHint: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: "right",
  },
  sectionTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: "right",
  },
  primaryLabel: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: "right",
  },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  itemHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.xs,
  },
  deleteButton: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  deleteButtonText: {
    ...theme.typography.label,
    color: theme.colors.error,
  },
  selectorBlock: {
    gap: theme.spacing.xs,
  },
  infoBox: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  infoTitle: {
    ...theme.typography.label,
    color: theme.colors.primary,
    textAlign: "right",
  },
  infoValue: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: "right",
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: "right",
    marginTop: theme.spacing.xs,
  },
  row: {
    flexDirection: "row-reverse",
    gap: theme.spacing.sm,
  },
  halfField: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  input: {
    height: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.onSurface,
    ...theme.typography.body,
  },
  dateTimeField: {
    minHeight: 64,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 1,
  },
  dateTimeValue: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
    fontFamily: "Cairo_600SemiBold",
    textAlign: "right",
  },
  dateTimeHint: {
    ...theme.typography.label,
    color: theme.colors.primary,
    textAlign: "right",
  },
  textArea: {
    minHeight: 96,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.onSurface,
    ...theme.typography.body,
  },
  optionRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  optionChip: {
    minWidth: 96,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
  },
  optionChipLarge: {
    flex: 1,
    minHeight: 52,
    justifyContent: "center",
  },
  optionChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
  },
  optionChipText: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
  },
  optionChipTextActive: {
    color: theme.colors.primary,
    fontFamily: "Cairo_700Bold",
  },
  shopChip: {
    minWidth: 200,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    gap: 2,
  },
  shopChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
  },
  shopChipTitle: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: "right",
  },
  shopChipTitleActive: {
    color: theme.colors.primary,
  },
  shopChipLocation: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: "right",
  },
  shopChipLocationActive: {
    color: theme.colors.primary,
  },
  stepper: {
    flexDirection: "row-reverse",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
  },
  stepperButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  stepperButtonText: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
  },
  stepperValue: {
    flex: 1,
    height: 48,
    ...theme.typography.title,
    color: theme.colors.onSurface,
  },
  uploadButton: {
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: theme.colors.primary,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.secondaryContainer,
  },
  uploadButtonText: {
    ...theme.typography.title,
    color: theme.colors.primary,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  imageGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  imageCard: {
    width: 116,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surface,
  },
  referenceImage: {
    width: "100%",
    height: 96,
  },
  removeImageButton: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: {
    ...theme.typography.label,
    color: theme.colors.error,
  },
  urgentButton: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  urgentButtonActive: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorContainer,
  },
  urgentButtonText: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
  },
  urgentButtonTextActive: {
    color: theme.colors.error,
    fontFamily: "Cairo_700Bold",
  },
  addButton: {
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
  },
  addButtonText: {
    ...theme.typography.title,
    color: theme.colors.primary,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    marginTop: theme.spacing.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...theme.typography.title,
    color: theme.colors.onPrimary,
  },
  inlineMessage: {
    width: "100%",
    gap: theme.spacing.sm,
  },
  retryButton: {
    alignSelf: "flex-end",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  retryButtonText: {
    ...theme.typography.label,
    color: theme.colors.error,
  },
  errorBox: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorContainer,
    padding: theme.spacing.md,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    textAlign: "right",
  },
  successBox: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  successTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: "right",
  },
  successText: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
    textAlign: "right",
  },
  successButton: {
    alignSelf: "flex-end",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  successButtonText: {
    ...theme.typography.label,
    color: theme.colors.onPrimary,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.error,
    textAlign: "right",
  },
  note: {
    ...theme.typography.label,
    color: theme.colors.onSurfaceVariant,
    textAlign: "right",
  },
  summaryRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
  },
  summaryValue: {
    ...theme.typography.title,
    color: theme.colors.primary,
  },
});
