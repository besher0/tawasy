import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/api-error";
import { downloadRemoteFile } from "../lib/download";
import theme from "../theme";
import { orderStatusLabel } from "../lib/labels";
import { buildOrderItemDisplay } from "../lib/order-item-details";
import { StatusBadge } from "../components/status-badge";

type ScreenRoute = RouteProp<RootStackParamList, "OrderDetails">;

export function OrderDetailsScreen() {
  const route = useRoute<ScreenRoute>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [order, setOrder] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  const loadOrder = useCallback(async () => {
    const response = await api.get(`/orders/${route.params.orderId}`);
    setOrder(response.data);
  }, [route.params.orderId]);

  useFocusEffect(
    useCallback(() => {
      void loadOrder();
    }, [loadOrder]),
  );

  const downloadImage = async (
    imageUrl: string,
    itemIndex: number,
    imageIndex: number,
  ) => {
    try {
      await downloadRemoteFile(
        imageUrl,
        `${order.orderNumber}-item-${itemIndex + 1}-image-${imageIndex + 1}.jpg`,
      );
    } catch {
      Alert.alert("خطأ", "تعذر تحميل الصورة.");
    }
  };

  const cancelOrder = async () => {
    try {
      setIsCancelling(true);
      setActionError(null);
      const response = await api.post(`/orders/${route.params.orderId}/cancel`);
      setOrder(response.data);
      setShowCancelConfirmation(false);
    } catch (error) {
      setActionError(
        getApiErrorMessage(error, "تعذر إلغاء الطلب. حاول مرة أخرى."),
      );
      setShowCancelConfirmation(false);
    } finally {
      setIsCancelling(false);
    }
  };

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.meta}>جاري تحميل الطلب...</Text>
      </View>
    );
  }

  const canCancel = !["Delivered", "Cancelled"].includes(order.status);
  const canEdit = ["New", "Reviewing", "In_Production"].includes(order.status);
  const deletionDate = order.deliveredAt
    ? new Date(new Date(order.deliveredAt).getTime() + 5 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <Text style={styles.title}>{order.customerName}</Text>
        <View style={styles.statusRow}>
          <StatusBadge
            label={orderStatusLabel(order.status)}
            tone={
              order.status === "Cancelled"
                ? "error"
                : order.status === "Delivered"
                  ? "success"
                  : order.status === "Ready"
                    ? "warning"
                    : "primary"
            }
          />
        </View>
        <Text style={[styles.meta, order.isUrgent ? styles.urgent : null]}>
          {order.isUrgent ? "طلب عاجل" : "طلب عادي"}
        </Text>
        <Text style={styles.meta}>فرع الطلب: {order.shop?.name ?? "-"}</Text>
        <Text style={styles.meta}>
          مكان التسليم:{" "}
          {order.moldDeliveryShop?.name ?? order.shop?.name ?? "-"}
        </Text>
        <Text style={styles.meta}>
          موعد التسليم: {new Date(order.deliveryDatetime).toLocaleString()}
        </Text>
        <Text style={styles.meta}>رقم الهاتف: {order.customerPhone}</Text>
        <Text style={styles.meta}>الإجمالي: {order.totalPrice} ر.س</Text>
        <Text style={styles.meta}>العربون: {order.depositAmount} ر.س</Text>
        {order.notes ? (
          <Text style={styles.orderNotes}>ملاحظات: {order.notes}</Text>
        ) : null}
        {deletionDate ? (
          <Text style={styles.retentionNote}>
            سيُحذف الطلب تلقائياً بعد خمسة أيام من التسليم، بتاريخ{" "}
            {deletionDate.toLocaleString("ar-SY")}.
          </Text>
        ) : null}
        {canEdit ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.editOrderButton}
            onPress={() =>
              navigation.navigate("EditOrder", { orderId: order.id })
            }
          >
            <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
            <Text style={styles.editOrderButtonText}>تعديل الطلب</Text>
          </TouchableOpacity>
        ) : null}
        {canCancel ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.cancelOrderButton,
              isCancelling ? styles.buttonDisabled : null,
            ]}
            disabled={isCancelling}
            onPress={() => setShowCancelConfirmation(true)}
          >
            <MaterialIcons name="cancel" size={20} color={theme.colors.error} />
            <Text style={styles.cancelOrderButtonText}>
              {isCancelling ? "جاري إلغاء الطلب..." : "إلغاء الطلب"}
            </Text>
          </TouchableOpacity>
        ) : null}
        {actionError ? (
          <Text style={styles.actionError}>{actionError}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>تفاصيل المنتجات</Text>
        {order.items.map((item: any, index: number) => {
          const display = buildOrderItemDisplay(item);

          return (
            <View key={item.id} style={styles.itemCard}>
              <Text style={styles.itemDescription}>
                {`${index + 1}. ${display.text}`}
              </Text>
              {item.referenceImages?.length ? (
                <View style={styles.imageRow}>
                  {item.referenceImages.map(
                    (imageUrl: string, imageIndex: number) => (
                      <View
                        key={`${imageUrl}-${imageIndex}`}
                        style={styles.imageCard}
                      >
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.referenceImage}
                        />
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="تحميل الصورة"
                          style={styles.downloadImageButton}
                          onPress={() =>
                            void downloadImage(imageUrl, index, imageIndex)
                          }
                        >
                          <MaterialIcons
                            name="download"
                            size={18}
                            color={theme.colors.onPrimary}
                          />
                          <Text style={styles.downloadImageText}>تحميل</Text>
                        </TouchableOpacity>
                      </View>
                    ),
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={showCancelConfirmation}
        onRequestClose={() => setShowCancelConfirmation(false)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            accessibilityLabel="إغلاق نافذة الإلغاء"
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() => setShowCancelConfirmation(false)}
          />
          <View style={styles.confirmationCard}>
            <View style={styles.confirmationIcon}>
              <MaterialIcons
                name="warning"
                size={30}
                color={theme.colors.error}
              />
            </View>
            <Text style={styles.confirmationTitle}>إلغاء الطلب</Text>
            <Text style={styles.confirmationText}>
              هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذه العملية.
            </Text>
            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={[
                  styles.confirmCancelButton,
                  isCancelling ? styles.buttonDisabled : null,
                ]}
                disabled={isCancelling}
                onPress={() => void cancelOrder()}
              >
                <Text style={styles.confirmCancelButtonText}>
                  {isCancelling ? "جاري الإلغاء..." : "نعم، إلغاء الطلب"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.keepOrderButton}
                disabled={isCancelling}
                onPress={() => setShowCancelConfirmation(false)}
              >
                <Text style={styles.keepOrderButtonText}>الاحتفاظ بالطلب</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  orderNumber: {
    ...theme.typography.title,
    color: theme.colors.primary,
    textAlign: "right",
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.onSurface,
    textAlign: "right",
  },
  meta: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: "right",
  },
  urgent: { color: theme.colors.error, fontFamily: "Cairo_700Bold" },
  statusRow: {
    flexDirection: "row-reverse",
  },
  orderNotes: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    textAlign: "right",
  },
  retentionNote: {
    ...theme.typography.label,
    color: theme.colors.primary,
    backgroundColor: theme.colors.secondaryContainer,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    textAlign: "right",
  },
  cancelOrderButton: {
    minHeight: 46,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorContainer,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  editOrderButton: {
    minHeight: 46,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  editOrderButtonText: {
    ...theme.typography.title,
    color: theme.colors.primary,
  },
  cancelOrderButtonText: {
    ...theme.typography.title,
    color: theme.colors.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionError: {
    ...theme.typography.body,
    color: theme.colors.error,
    textAlign: "right",
  },
  modalRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 27, 41, 0.58)",
  },
  confirmationCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: theme.spacing.xl,
    alignItems: "center",
    gap: theme.spacing.md,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  confirmationIcon: {
    width: 58,
    height: 58,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.errorContainer,
  },
  confirmationTitle: {
    ...theme.typography.heading,
    color: theme.colors.error,
    textAlign: "center",
  },
  confirmationText: {
    ...theme.typography.body,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
  },
  confirmationActions: {
    width: "100%",
    gap: theme.spacing.sm,
  },
  confirmCancelButton: {
    minHeight: 48,
    borderRadius: theme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.error,
  },
  confirmCancelButtonText: {
    ...theme.typography.title,
    color: theme.colors.onPrimary,
  },
  keepOrderButton: {
    minHeight: 46,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  keepOrderButtonText: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
  },
  itemCard: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  itemDescription: {
    ...theme.typography.body,
    color: theme.colors.onSurface,
    textAlign: "right",
    lineHeight: 26,
  },
  imageRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  imageCard: {
    width: 132,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceContainerLowest,
  },
  referenceImage: {
    width: "100%",
    height: 118,
  },
  downloadImageButton: {
    minHeight: 38,
    backgroundColor: theme.colors.primary,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  downloadImageText: {
    ...theme.typography.label,
    color: theme.colors.onPrimary,
  },
});
