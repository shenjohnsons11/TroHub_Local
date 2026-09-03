import React, {
  useEffect,
  useRef,
} from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  View,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { AppText } from "@/components/ui/typography";
import { Invoice } from "../types/Invoice";
import { useAppTheme } from "../contexts/ThemeContext";
import AppButton from "./ui/AppButton";
import { Ionicons } from "@expo/vector-icons";
import {
  formatCurrency,
  formatPhone,
  unformatNumber,
} from "../utils/formatters";
import { useTranslation } from "../contexts/LanguageContext";
import { MeterReadingCard } from "./ui/meter-reading-card";

type Props = {
  visible: boolean;

  invoice: Invoice | null;

  role?: "admin" | "tenant";

  onClose: () => void;

  onPay?: (
    invoiceId: string,
  ) => void;

  onConfirmPaid?: (
    invoiceId: string,
  ) => void;
};

export default function InvoiceDetailModal({
  visible,
  invoice,
  role = "tenant",
  onClose,
  onPay,
  onConfirmPaid,
}: Props) {
  const { theme } =
    useAppTheme();

  const { t } =
    useTranslation();

  const styles =
    createStyles(theme);

  const titleRef =
    useRef<
      React.ElementRef<
        typeof AppText
      >
    >(null);

  const currency = (
    value: unknown,
  ) =>
    formatCurrency(
      unformatNumber(value),
    );

  const electricUsage =
    invoice &&
    invoice.details.electric
      .newIndex !== null &&
    invoice.details.electric
      .oldIndex !== null
      ? invoice.details.electric
          .newIndex -
        invoice.details.electric
          .oldIndex
      : 0;

  const waterUsage =
    invoice &&
    invoice.details.water
      .newIndex !== null &&
    invoice.details.water
      .oldIndex !== null
      ? invoice.details.water
          .newIndex -
        invoice.details.water
          .oldIndex
      : 0;

  const electricityPrice =
    invoice &&
    electricUsage > 0
      ? Math.round(
          unformatNumber(
            invoice.details
              .electric.amount,
          ) / electricUsage,
        )
      : 0;

  const waterPrice =
    invoice &&
    waterUsage > 0
      ? Math.round(
          unformatNumber(
            invoice.details
              .water.amount,
          ) / waterUsage,
        )
      : 0;

  const dynamicServices =
    invoice?.services || [];

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setTimeout(
      () => {
        const node =
          findNodeHandle(
            titleRef.current,
          );

        if (node) {
          AccessibilityInfo.setAccessibilityFocus(
            node,
          );
        }
      },
      300,
    );

    return () =>
      clearTimeout(timer);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.modalOverlay
        }
      >
        <View
          style={
            styles.modalBox
          }
          accessibilityViewIsModal
        >
          {invoice && (
            <>
              {/* HEADER */}

              <View
                style={
                  styles.modalHeader
                }
              >
                <View
                  style={
                    styles.modalTitleBox
                  }
                >
                  <AppText
                    ref={titleRef}
                    style={
                      styles.modalTitle
                    }
                    accessibilityRole="header"
                    accessibilityLiveRegion="polite"
                  >
                    {t(
                      "invoiceDetail.title",
                    )}
                  </AppText>

                  <AppText
                    style={
                      styles.modalSub
                    }
                  >
                    {t(
                      "invoiceDetail.subtitle",
                      {
                        month:
                          invoice.month,

                        room:
                          invoice.room,
                      },
                    )}
                  </AppText>
                </View>

                <Pressable
                  style={
                    styles.closeButton
                  }
                  onPress={
                    onClose
                  }
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    "invoiceDetail.close",
                  )}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={
                      theme.text
                    }
                  />
                </Pressable>
              </View>

              {/* TỔNG TIỀN */}

              <View
                style={
                  styles.amountHero
                }
              >
                <AppText
                  style={
                    styles.amountHeroLabel
                  }
                >
                  {t(
                    "invoiceDetail.totalDue",
                  )}
                </AppText>

                <AppText
                  style={
                    styles.amountHeroValue
                  }
                >
                  {formatCurrency(
                    invoice.numericAmount ??
                      unformatNumber(
                        invoice.amount,
                      ),
                  )}
                </AppText>
              </View>

              {/* NGƯỜI THUÊ */}

              <View
                style={
                  styles.identityBlock
                }
              >
                <AppText
                  style={
                    styles.identityText
                  }
                >
                  {t(
                    "invoiceDetail.tenant",
                    {
                      name:
                        invoice.tenantName ||
                        t(
                          "invoiceDetail.notUpdated",
                        ),
                    },
                  )}
                </AppText>

                <AppText
                  style={
                    styles.identityText
                  }
                >
                  {t(
                    "invoiceDetail.phone",
                    {
                      phone:
                        invoice.tenantPhone
                          ? formatPhone(
                              invoice.tenantPhone,
                            )
                          : t(
                              "invoiceDetail.notUpdated",
                            ),
                    },
                  )}
                </AppText>

                <AppText
                  style={
                    styles.identityText
                  }
                >
                  {t(
                    "invoiceDetail.room",
                    {
                      room:
                        invoice.room ||
                        t(
                          "invoiceDetail.notUpdated",
                        ),
                    },
                  )}
                </AppText>
              </View>

              <ScrollView
                style={styles.lines}
                showsVerticalScrollIndicator={
                  false
                }
              >
                {invoice.type ===
                "deposit" ? (
                  <View
                    style={
                      styles.detailRow
                    }
                  >
                    <AppText
                      style={
                        styles.detailLabel
                      }
                    >
                      {t(
                        "invoiceDetail.deposit",
                      )}
                    </AppText>

                    <AppText
                      style={
                        styles.detailValue
                      }
                    >
                      {formatCurrency(
                        invoice.depositAmount ??
                          invoice.numericAmount ??
                          0,
                      )}
                    </AppText>
                  </View>
                ) : (
                  <>
                    {/* TIỀN PHÒNG */}

                    <View
                      style={
                        styles.detailRow
                      }
                    >
                      <AppText
                        style={
                          styles.detailLabel
                        }
                      >
                        {t(
                          "invoiceDetail.rent",
                        )}
                      </AppText>

                      <AppText
                        style={
                          styles.detailValue
                        }
                      >
                        {currency(
                          invoice
                            .details
                            .roomFee,
                        )}
                      </AppText>
                    </View>

                    {/* ĐIỆN NƯỚC */}

                    <View
                      style={
                        styles.meterCards
                      }
                    >
                      {invoice.details
                        .electric
                        .newIndex !==
                        null &&
                      invoice.details
                        .electric
                        .oldIndex !==
                        null ? (
                        <MeterReadingCard
                          icon="flash-outline"
                          label={t(
                            "invoiceDetail.electricity",
                          )}
                          unit="kWh"
                          previous={
                            invoice
                              .details
                              .electric
                              .oldIndex
                          }
                          current={
                            invoice
                              .details
                              .electric
                              .newIndex
                          }
                          unitPrice={
                            electricityPrice
                          }
                        />
                      ) : (
                        <DetailRow
                          label={t(
                            "invoiceDetail.electricity",
                          )}
                          value={currency(
                            invoice
                              .details
                              .electric
                              .amount,
                          )}
                          styles={
                            styles
                          }
                        />
                      )}

                      {invoice.details
                        .water
                        .newIndex !==
                        null &&
                      invoice.details
                        .water
                        .oldIndex !==
                        null ? (
                        <MeterReadingCard
                          icon="water-outline"
                          label={t(
                            "invoiceDetail.water",
                          )}
                          unit="m³"
                          previous={
                            invoice
                              .details
                              .water
                              .oldIndex
                          }
                          current={
                            invoice
                              .details
                              .water
                              .newIndex
                          }
                          unitPrice={
                            waterPrice
                          }
                        />
                      ) : (
                        <DetailRow
                          label={t(
                            "invoiceDetail.water",
                          )}
                          value={currency(
                            invoice
                              .details
                              .water
                              .amount,
                          )}
                          styles={
                            styles
                          }
                        />
                      )}
                    </View>

                    {/* =============================== */}
                    {/* DỊCH VỤ ĐỘNG */}
                    {/* =============================== */}

                    {dynamicServices.length >
                      0 ? (
                      <View
                        style={
                          styles.servicesSection
                        }
                      >
                        <View
                          style={
                            styles.servicesHeader
                          }
                        >
                          <View
                            style={
                              styles.servicesHeaderIcon
                            }
                          >
                            <Ionicons
                              name="apps-outline"
                              size={
                                18
                              }
                              color={
                                theme.primary
                              }
                            />
                          </View>

                          <View>
                            <AppText
                              style={
                                styles.servicesTitle
                              }
                            >
                              Dịch vụ đi kèm
                            </AppText>

                            <AppText
                              style={
                                styles.servicesSubtitle
                              }
                            >
                              {
                                dynamicServices.length
                              }{" "}
                              dịch vụ
                            </AppText>
                          </View>
                        </View>

                        <View
                          style={
                            styles.servicesCard
                          }
                        >
                          {dynamicServices.map(
                            (
                              service,
                              index,
                            ) => (
                              <View
                                key={
                                  service.serviceId ||
                                  `${service.name}-${index}`
                                }
                                style={[
                                  styles.serviceRow,

                                  index ===
                                    dynamicServices.length -
                                      1 &&
                                    styles.serviceLastRow,
                                ]}
                              >
                                <View
                                  style={
                                    styles.serviceLeft
                                  }
                                >
                                  <View
                                    style={
                                      styles.serviceCheck
                                    }
                                  >
                                    <Ionicons
                                      name="checkmark"
                                      size={
                                        14
                                      }
                                      color={
                                        theme.primary
                                      }
                                    />
                                  </View>

                                  <View
                                    style={
                                      styles.serviceTextBox
                                    }
                                  >
                                    <AppText
                                      style={
                                        styles.serviceName
                                      }
                                    >
                                      {
                                        service.name
                                      }
                                    </AppText>

                                    {service.unit ? (
                                      <AppText
                                        style={
                                          styles.serviceUnit
                                        }
                                      >
                                        {service.unit ===
                                        "month"
                                          ? "Theo tháng"
                                          : service.unit}
                                      </AppText>
                                    ) : null}
                                  </View>
                                </View>

                                <AppText
                                  style={
                                    styles.serviceAmount
                                  }
                                >
                                  {formatCurrency(
                                    service.amount,
                                  )}
                                </AppText>
                              </View>
                            ),
                          )}
                        </View>
                      </View>
                    ) : (
                      /*
                       * FALLBACK CHO HÓA ĐƠN CŨ.
                       *
                       * Chỉ hiện các field legacy nếu
                       * invoice chưa có services động.
                       */
                      <>
                        {unformatNumber(
                          invoice
                            .details
                            .parking,
                        ) > 0 && (
                          <DetailRow
                            label={t(
                              "invoiceDetail.parking",
                            )}
                            value={currency(
                              invoice
                                .details
                                .parking,
                            )}
                            styles={
                              styles
                            }
                          />
                        )}

                        {unformatNumber(
                          invoice
                            .details
                            .internet,
                        ) > 0 && (
                          <DetailRow
                            label="Internet"
                            value={currency(
                              invoice
                                .details
                                .internet,
                            )}
                            styles={
                              styles
                            }
                          />
                        )}

                        {unformatNumber(
                          invoice
                            .details
                            .garbage,
                        ) > 0 && (
                          <DetailRow
                            label={t(
                              "invoiceDetail.garbage",
                            )}
                            value={currency(
                              invoice
                                .details
                                .garbage,
                            )}
                            styles={
                              styles
                            }
                          />
                        )}
                      </>
                    )}
                  </>
                )}

                {/* TỔNG CỘNG */}

                <View
                  style={
                    styles.totalRow
                  }
                >
                  <AppText
                    style={
                      styles.totalLabel
                    }
                  >
                    {t(
                      "invoiceDetail.total",
                    )}
                  </AppText>

                  <AppText
                    style={
                      styles.totalValue
                    }
                  >
                    {formatCurrency(
                      invoice.numericAmount ??
                        unformatNumber(
                          invoice.amount,
                        ),
                    )}
                  </AppText>
                </View>
              </ScrollView>

              {/* BUTTON */}

              {invoice.status ===
              "unpaid" ? (
                role ===
                "tenant" ? (
                  <AppButton
                    icon="card-outline"
                    onPress={() =>
                      onPay &&
                      onPay(
                        invoice.id,
                      )
                    }
                  >
                    {t(
                      "invoiceDetail.pay",
                    )}
                  </AppButton>
                ) : (
                  <AppButton
                    icon="checkmark-circle-outline"
                    onPress={() =>
                      onConfirmPaid &&
                      onConfirmPaid(
                        invoice.id,
                      )
                    }
                  >
                    {t(
                      "invoiceDetail.confirm",
                    )}
                  </AppButton>
                )
              ) : (
                <View
                  style={
                    styles.paidBox
                  }
                >
                  <AppText
                    style={
                      styles.paidBoxText
                    }
                  >
                    {t(
                      "invoiceDetail.paid",
                    )}
                  </AppText>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  label,
  value,
  styles,
}: {
  label: string;

  value: string;

  styles: ReturnType<
    typeof createStyles
  >;
}) {
  return (
    <View
      style={
        styles.detailRow
      }
    >
      <AppText
        style={
          styles.detailLabel
        }
      >
        {label}
      </AppText>

      <AppText
        style={
          styles.detailValue
        }
      >
        {value}
      </AppText>
    </View>
  );
}

const createStyles = (
  theme: ReturnType<
    typeof useAppTheme
  >["theme"],
) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,

      backgroundColor:
        theme.overlay,

      justifyContent:
        "flex-end",
    },

    modalBox: {
      backgroundColor:
        theme.surface,

      borderTopLeftRadius:
        24,

      borderTopRightRadius:
        24,

      paddingHorizontal:
        22,

      paddingTop:
        22,

      paddingBottom:
        32,

      maxHeight:
        "92%",

      flexShrink:
        1,
    },

    modalHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        16,

      marginBottom:
        18,
    },

    modalTitleBox: {
      flex:
        1,
    },

    modalTitle: {
      fontSize:
        21,

      fontWeight:
        "900",

      color:
        theme.text,
    },

    modalSub: {
      color:
        theme.muted,

      fontSize:
        13,

      marginTop:
        5,
    },

    closeButton: {
      width:
        44,

      height:
        44,

      borderRadius:
        22,

      backgroundColor:
        theme.surfaceElevated,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    amountHero: {
      backgroundColor:
        theme.primarySoft,

      borderRadius:
        18,

      padding:
        18,

      marginBottom:
        8,
    },

    amountHeroLabel: {
      color:
        theme.muted,

      fontSize:
        12,

      fontWeight:
        "700",
    },

    amountHeroValue: {
      color:
        theme.primary,

      fontSize:
        28,

      fontWeight:
        "900",

      marginTop:
        5,
    },

    identityBlock: {
      paddingVertical:
        12,

      borderBottomWidth:
        1,

      borderBottomColor:
        theme.border,
    },

    identityText: {
      color:
        theme.text,

      fontSize:
        13,

      lineHeight:
        20,
    },

    lines: {
      flexShrink:
        1,

      flexGrow:
        0,
    },

    meterCards: {
      gap:
        10,

      marginTop:
        10,
    },

    detailRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      paddingVertical:
        13,

      borderBottomWidth:
        1,

      borderBottomColor:
        theme.border,

      gap:
        12,
    },

    detailLabel: {
      color:
        theme.muted,

      fontSize:
        14,
    },

    detailValue: {
      color:
        theme.text,

      fontSize:
        14,

      fontWeight:
        "800",

      textAlign:
        "right",
    },

    /* ================================ */
    /* DỊCH VỤ ĐI KÈM */
    /* ================================ */

    servicesSection: {
      marginTop:
        18,
    },

    servicesHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        10,

      marginBottom:
        10,
    },

    servicesHeaderIcon: {
      width:
        34,

      height:
        34,

      borderRadius:
        12,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        theme.primarySoft,
    },

    servicesTitle: {
      color:
        theme.text,

      fontSize:
        15,

      fontWeight:
        "900",
    },

    servicesSubtitle: {
      color:
        theme.muted,

      fontSize:
        11,

      fontWeight:
        "600",

      marginTop:
        2,
    },

    servicesCard: {
      borderWidth:
        1,

      borderColor:
        theme.border,

      borderRadius:
        16,

      backgroundColor:
        theme.surface,

      overflow:
        "hidden",
    },

    serviceRow: {
      minHeight:
        58,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      paddingHorizontal:
        12,

      paddingVertical:
        10,

      borderBottomWidth:
        1,

      borderBottomColor:
        theme.border,

      gap:
        12,
    },

    serviceLastRow: {
      borderBottomWidth:
        0,
    },

    serviceLeft: {
      flex:
        1,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        10,
    },

    serviceCheck: {
      width:
        30,

      height:
        30,

      borderRadius:
        15,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        theme.primarySoft,
    },

    serviceTextBox: {
      flex:
        1,
    },

    serviceName: {
      color:
        theme.text,

      fontSize:
        14,

      fontWeight:
        "800",
    },

    serviceUnit: {
      color:
        theme.muted,

      fontSize:
        11,

      fontWeight:
        "600",

      marginTop:
        2,
    },

    serviceAmount: {
      color:
        theme.primary,

      fontSize:
        14,

      fontWeight:
        "900",

      textAlign:
        "right",
    },

    totalRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      marginTop:
        18,

      marginBottom:
        20,

      gap:
        12,
    },

    totalLabel: {
      color:
        theme.text,

      fontSize:
        17,

      fontWeight:
        "900",
    },

    totalValue: {
      color:
        theme.primary,

      fontSize:
        20,

      fontWeight:
        "900",

      textAlign:
        "right",
    },

    paidBox: {
      height:
        52,

      backgroundColor:
        theme.positiveSoft,

      borderRadius:
        12,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    paidBoxText: {
      color:
        theme.positive,

      fontSize:
        15,

      fontWeight:
        "900",
    },
  });