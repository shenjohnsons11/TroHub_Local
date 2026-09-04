import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { AppText } from "@/components/ui/typography";
import Card from "../components/Card";
import { useAppTheme } from "../contexts/ThemeContext";
import { Contract, ContractStatus } from "../types/Contract";
import SignContractWizard from "../components/SignContractWizard";
import PaymentModal from "../components/PaymentModal";
import { contractService } from "../services/contractService";
import { invoiceService } from "../services/invoiceService";
import { Invoice } from "../types/Invoice";
import { useNotification } from "../hooks/useNotification";
import { Ionicons } from "@expo/vector-icons";
import GradientHero from "../components/ui/GradientHero";
import AnimatedEntry from "../components/ui/AnimatedEntry";
import IllustratedEmptyState from "../components/ui/IllustratedEmptyState";
import { ContentSkeleton } from "../components/ui/content-skeleton";
import { useTranslation } from "../contexts/LanguageContext";
import {
  formatCurrency,
  formatMeterReading,
  unformatNumber,
} from "../utils/formatters";
import ContractViewerModal from "../components/ContractViewerModal";
import TenantRoomSwitcher from "../components/TenantRoomSwitcher";
import FeatureIconBox from "../components/ui/FeatureIconBox";
import { FEATURE_ICONS } from "../constants/featureIcons";

const getStatusLabel = (
  status: ContractStatus,
  t: (key: string) => string,
): string => {
  switch (status) {
    case "pending":
      return t("tenantContract.pending");
    case "active":
      return t("tenantContract.active");
    case "expired":
      return t("tenantContract.expired");
    case "terminated":
      return t("tenantContract.terminated");
    case "cancelled":
      return t("tenantContract.cancelled");
    case "reserved":
      return t("contracts.reserved");
    case "requesting_termination":
      return t("tenantContract.terminateSent");
    case "awaiting_approval":
      return t("tenantContract.awaiting");
    default:
      return t("tenantContract.unknown");
  }
};

const getStatusColor = (
  status: ContractStatus,
  theme: ReturnType<typeof useAppTheme>["theme"],
): string => {
  switch (status) {
    case "pending":
      return "#dc2626";
    case "active":
      return theme.positive;
    case "expired":
      return theme.muted;
    case "terminated":
      return theme.danger;
    case "cancelled":
      return theme.danger;
    case "reserved":
      return theme.primary;
    case "requesting_termination":
      return theme.danger;
    case "awaiting_approval":
      return theme.primary;
    default:
      return theme.muted;
  }
};

const getStatusBg = (
  status: ContractStatus,
  theme: ReturnType<typeof useAppTheme>["theme"],
): string => {
  switch (status) {
    case "pending":
      return "#fef2f2";
    case "active":
      return theme.positiveSoft;
    case "expired":
      return theme.surfaceElevated;
    case "terminated":
      return theme.warningSoft;
    case "cancelled":
      return theme.warningSoft;
    case "reserved":
      return theme.primarySoft;
    case "requesting_termination":
      return theme.warningSoft;
    case "awaiting_approval":
      return theme.primarySoft;
    default:
      return theme.surfaceElevated;
  }
};

type Props = {
  onNavigate?: (screen: "invoice", params?: any) => void;
  params?: { contractId?: string };
  selectedRoomId?: string;
  onRoomSelect: (roomId: string) => void;
};

export default function ContractScreen({
  onNavigate,
  params,
  selectedRoomId,
  onRoomSelect,
}: Props) {
  const notification = useNotification();
  const { theme } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const [loadingDepositInvoiceId, setLoadingDepositInvoiceId] = useState<
    string | null
  >(null);

  // Thêm state cho Wizard
  const [wizardVisible, setWizardVisible] = useState(false);

  const [selectedContract, setSelectedContract] =
    useState<Contract | null>(null);

  const [viewerContractId, setViewerContractId] =
    useState<string | null>(null);

  // Chỉ dùng để bung / thu gọn danh sách dịch vụ trên từng hợp đồng
  const [expandedServiceIds, setExpandedServiceIds] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setIsLoading(true);

      const data =
        await contractService.getMyContracts();

      setContracts(data);

      if (params?.contractId) {
        const target = data.find(
          (contract) =>
            contract.id === params.contractId,
        );

        if (target) {
          setSelectedContract(target);
          setWizardVisible(true);
        }
      }
    } catch (error) {
      console.log(
        "Lỗi load hợp đồng:",
        error,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    const data =
      await contractService.getMyContracts();

    setContracts(data);
    setIsRefreshing(false);
  };

  const handleSignContract = (
    contract: Contract,
  ) => {
    setSelectedContract(contract);
    setWizardVisible(true);
  };

  const toggleContractServices = (
    contractId: string,
  ) => {
    setExpandedServiceIds((prev) => ({
      ...prev,
      [contractId]:
        !prev[contractId],
    }));
  };

  const openDepositPayment = async (
    invoiceId: string,
  ) => {
    try {
      setLoadingDepositInvoiceId(
        invoiceId,
      );

      const invoice =
        await invoiceService.getInvoiceById(
          invoiceId,
        );

      setPaymentInvoice(invoice);
    } catch (error) {
      notification.error(
        error instanceof Error
          ? error.message
          : t(
            "tenantContract.depositLoadFailed",
          ),
      );

      if (onNavigate) {
        onNavigate("invoice", {
          paymentInvoiceId:
            invoiceId,
        });
      }
    } finally {
      setLoadingDepositInvoiceId(
        null,
      );
    }
  };

  const handleConfirmSign = async (
    contract: Contract,
    signatureBase64?: string,
  ) => {
    try {
      setSigningId(contract.id);

      const result =
        await contractService.signContract(
          contract.id,
          signatureBase64,
        );

      notification.success(
        t("tenantContract.signed"),
      );

      setWizardVisible(false);

      // Reload danh sách
      const data =
        await contractService.getMyContracts();

      setContracts(data);

      if (result.invoiceId) {
        await openDepositPayment(
          result.invoiceId,
        );
      } else if (
        result.depositRequired
      ) {
        notification.warning(
          t(
            "tenantContract.depositUnavailable",
          ),
        );
      }
    } catch (error) {
      notification.error(
        error instanceof Error
          ? error.message
          : t(
            "tenantContract.signFailed",
          ),
      );
    } finally {
      setSigningId(null);
    }
  };

  const handleDepositPaymentConfirmed =
    async (_invoiceId: string) => {
      setPaymentInvoice(null);

      await loadContracts();

      notification.success(
        t(
          "tenantContract.depositRecorded",
        ),
      );
    };

  const handleRequestTerminate = async (
    contract: Contract,
  ) => {
    const confirmed =
      await notification.confirm({
        title: t(
          "tenantContract.terminateTitle",
        ),
        message: t(
          "tenantContract.terminateMessage",
          {
            room: contract.room,
          },
        ),
        cancelText: t(
          "common.cancel",
        ),
        confirmText: t(
          "tenantContract.terminate",
        ),
        destructive: true,
      });

    if (!confirmed) return;

    try {
      setIsLoading(true);

      await contractService.requestTerminate(
        contract.id,
      );

      notification.success(
        t(
          "tenantContract.terminateSent",
        ),
        {
          title: t(
            "common.success",
          ),
        },
      );

      const data =
        await contractService.getMyContracts();

      setContracts(data);
    } catch (error) {
      notification.error(
        error instanceof Error
          ? error.message
          : t(
            "tenantContract.terminateFailed",
          ),
        {
          title: t(
            "common.error",
          ),
        },
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <ContentSkeleton rows={3} />
    );
  }

  return (
    <>
      <FlatList
        data={contracts}
        keyExtractor={(contract) =>
          contract.id
        }
        contentContainerStyle={[
          styles.content,
          contracts.length === 0 &&
          styles.emptyListContent,
        ]}
        style={styles.container}
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={
              handleRefresh
            }
            tintColor={
              theme.primary
            }
          />
        }
        ListHeaderComponent={
          <>
            <AppText
              style={styles.title}
            >
              {t(
                "tenantContract.title",
              )}
            </AppText>

            <AppText
              style={styles.subtitle}
            >
              {t(
                "tenantContract.subtitle",
              )}
            </AppText>

            <TenantRoomSwitcher
              contracts={contracts}
              selectedRoomId={
                selectedRoomId
              }
              onSelect={
                onRoomSelect
              }
            />
          </>
        }
        ListEmptyComponent={
          <View
            style={
              styles.emptyContainer
            }
          >
            <IllustratedEmptyState
              description={t(
                "tenantContract.emptyDescription",
              )}
              kind="contract"
              title={t(
                "tenantContract.empty",
              )}
            />

            <AppText
              style={
                styles.emptyHint
              }
            >
              {t(
                "tenantContract.refresh",
              )}
            </AppText>
          </View>
        }
        renderItem={({
          item: contract,
          index,
        }) => {
          const isSigning =
            signingId ===
            contract.id;

          const extraServices =
            contract.services || [];

          const servicesExpanded =
            Boolean(
              expandedServiceIds[
              contract.id
              ],
            );

          return (
            <AnimatedEntry
              delay={
                Math.min(
                  index,
                  5,
                ) * 45
              }
            >
              <GradientHero
                detail={`${getStatusLabel(
                  contract.status,
                  t,
                )} · ${contract.startDate
                  } — ${contract.endDate
                  }`}
                icon="document-text-outline"
                iconToken={FEATURE_ICONS.contracts}
                label={t(
                  "tenantContract.hero",
                  {
                    room:
                      contract.room,
                  },
                )}
                value={formatCurrency(
                  unformatNumber(
                    contract.rentFee,
                  ),
                )}
              />

              <Card
                style={
                  styles.contractCard
                }
              >
                {/* Header: Phòng + Badge */}

                <View
                  style={
                    styles.cardHeader
                  }
                >
                  <View
                    style={
                      styles.cardHeaderLeft
                    }
                  >
                    <AppText
                      style={
                        styles.roomTitle
                      }
                    >
                      {t(
                        "tenantContract.room",
                        {
                          room:
                            contract.room,
                        },
                      )}
                    </AppText>

                    <AppText
                      style={
                        styles.tenantText
                      }
                    >
                      {
                        contract.tenantName
                      }
                    </AppText>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,

                      contract.status ===
                      "pending" &&
                      styles.pendingBadge,

                      {
                        backgroundColor:
                          getStatusBg(
                            contract.status,
                            theme,
                          ),
                      },
                    ]}
                  >
                    <AppText
                      style={[
                        styles.statusText,

                        contract.status ===
                        "pending" &&
                        styles.pendingText,

                        {
                          color:
                            getStatusColor(
                              contract.status,
                              theme,
                            ),
                        },
                      ]}
                    >
                      {getStatusLabel(
                        contract.status,
                        t,
                      )}
                    </AppText>
                  </View>
                </View>

                {/* Thông tin chính */}

                <View
                  style={
                    styles.infoGrid
                  }
                >
                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <AppText
                      style={
                        styles.infoLabel
                      }
                    >
                      {t(
                        "tenantContract.rent",
                      )}
                    </AppText>

                    <AppText
                      style={
                        styles.infoValue
                      }
                    >
                      {formatCurrency(
                        unformatNumber(
                          contract.rentFee,
                        ),
                      )}
                    </AppText>
                  </View>

                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <AppText
                      style={
                        styles.infoLabel
                      }
                    >
                      {t(
                        "tenantContract.deposit",
                      )}
                    </AppText>

                    <AppText
                      style={
                        styles.infoValue
                      }
                    >
                      {formatCurrency(
                        unformatNumber(
                          contract.deposit,
                        ),
                      )}
                    </AppText>
                  </View>

                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <AppText
                      style={
                        styles.infoLabel
                      }
                    >
                      {t(
                        "tenantContract.start",
                      )}
                    </AppText>

                    <AppText
                      style={
                        styles.infoValue
                      }
                    >
                      {
                        contract.startDate
                      }
                    </AppText>
                  </View>

                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <AppText
                      style={
                        styles.infoLabel
                      }
                    >
                      {t(
                        "tenantContract.end",
                      )}
                    </AppText>

                    <AppText
                      style={
                        styles.infoValue
                      }
                    >
                      {
                        contract.endDate
                      }
                    </AppText>
                  </View>
                </View>

                {/* Thanh tiến trình */}

                {contract.status ===
                  "active" && (
                    <View
                      style={
                        styles.progressBox
                      }
                    >
                      <View
                        style={
                          styles.progressBg
                        }
                      >
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width:
                                contract.progressPercent as `${number}%`,
                            },
                          ]}
                        />
                      </View>

                      <View
                        style={
                          styles.progressTextRow
                        }
                      >
                        <AppText
                          style={
                            styles.progressText
                          }
                        >
                          {t(
                            "tenantContract.used",
                            {
                              count:
                                contract.usedMonths,
                            },
                          )}
                        </AppText>

                        <AppText
                          style={
                            styles.progressText
                          }
                        >
                          {t(
                            "tenantContract.remaining",
                            {
                              count:
                                contract.remainingMonths,
                            },
                          )}
                        </AppText>
                      </View>
                    </View>
                  )}

                {/* ================================= */}
                {/* PHÍ DỊCH VỤ */}
                {/* ================================= */}

                {[
                  "active",
                  "pending",
                  "reserved",
                ].includes(
                  contract.status,
                ) && (
                    <View
                      style={
                        styles.servicesBox
                      }
                    >
                      <AppText
                        style={
                          styles.servicesTitle
                        }
                      >
                        Phí dịch vụ
                      </AppText>

                      {/* ĐIỆN */}

                      <View
                        style={
                          styles.utilityRow
                        }
                      >
                        <View
                          style={
                            styles.utilityLeft
                          }
                        >
                          <View
                            style={
                              styles.utilityIconBox
                            }
                          >
                            <Ionicons
                              name="flash-outline"
                              size={19}
                              color="#F59E0B"
                            />
                          </View>

                          <View>
                            <AppText
                              style={
                                styles.utilityName
                              }
                            >
                              Điện
                            </AppText>

                            <AppText
                              style={
                                styles.utilitySubText
                              }
                            >
                              Chỉ số đầu:{" "}
                              {formatMeterReading(
                                contract
                                  .meterTerms
                                  .initialElectricity,
                              )}{" "}
                              kWh
                            </AppText>
                          </View>
                        </View>

                        <AppText
                          style={
                            styles.utilityPrice
                          }
                        >
                          {formatCurrency(
                            contract
                              .meterTerms
                              .electricityPrice,
                          )}{" "}
                          / kWh
                        </AppText>
                      </View>

                      {/* NƯỚC */}

                      <View
                        style={
                          styles.utilityRow
                        }
                      >
                        <View
                          style={
                            styles.utilityLeft
                          }
                        >
                          <View
                            style={
                              styles.utilityIconBox
                            }
                          >
                            <Ionicons
                              name="water-outline"
                              size={19}
                              color="#0EA5E9"
                            />
                          </View>

                          <View>
                            <AppText
                              style={
                                styles.utilityName
                              }
                            >
                              Nước
                            </AppText>

                            <AppText
                              style={
                                styles.utilitySubText
                              }
                            >
                              Chỉ số đầu:{" "}
                              {formatMeterReading(
                                contract
                                  .meterTerms
                                  .initialWater,
                              )}{" "}
                              m³
                            </AppText>
                          </View>
                        </View>

                        <AppText
                          style={
                            styles.utilityPrice
                          }
                        >
                          {formatCurrency(
                            contract
                              .meterTerms
                              .waterPrice,
                          )}{" "}
                          / m³
                        </AppText>
                      </View>

                      {/* DỊCH VỤ ĐI KÈM */}

                      {extraServices.length >
                        0 && (
                          <View
                            style={
                              styles.extraServicesWrapper
                            }
                          >
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Xem dịch vụ đi kèm"
                              style={
                                styles.extraServicesToggle
                              }
                              onPress={() =>
                                toggleContractServices(
                                  contract.id,
                                )
                              }
                            >
                              <View
                                style={
                                  styles.extraServicesToggleLeft
                                }
                              >
                                <View
                                  style={
                                    styles.extraServicesToggleIcon
                                  }
                                >
                                  <Ionicons
                                    name="apps-outline"
                                    size={18}
                                    color={
                                      theme.primary
                                    }
                                  />
                                </View>

                                <View>
                                  <AppText
                                    style={
                                      styles.extraServicesToggleTitle
                                    }
                                  >
                                    Dịch vụ đi kèm
                                  </AppText>

                                  <AppText
                                    style={
                                      styles.extraServicesToggleSubtitle
                                    }
                                  >
                                    {
                                      extraServices.length
                                    }{" "}
                                    dịch vụ đã chọn
                                  </AppText>
                                </View>
                              </View>

                              <Ionicons
                                name={
                                  servicesExpanded
                                    ? "chevron-up-outline"
                                    : "chevron-down-outline"
                                }
                                size={20}
                                color={
                                  theme.muted
                                }
                              />
                            </Pressable>

                            {servicesExpanded && (
                              <View
                                style={
                                  styles.extraServicesList
                                }
                              >
                                {extraServices.map(
                                  (
                                    service,
                                    serviceIndex,
                                  ) => (
                                    <View
                                      key={
                                        service.serviceId ||
                                        `${service.name}-${serviceIndex}`
                                      }
                                      style={[
                                        styles.extraServiceRow,

                                        serviceIndex ===
                                        extraServices.length -
                                        1 &&
                                        styles.extraServiceRowLast,
                                      ]}
                                    >
                                      <View
                                        style={
                                          styles.extraServiceInfo
                                        }
                                      >
                                        <View
                                          style={
                                            styles.extraServiceCheck
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
                                            styles.extraServiceTextBox
                                          }
                                        >
                                          <AppText
                                            style={
                                              styles.extraServiceName
                                            }
                                          >
                                            {
                                              service.name
                                            }
                                          </AppText>

                                          {service.unit ? (
                                            <AppText
                                              style={
                                                styles.extraServiceUnit
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
                                          styles.extraServicePrice
                                        }
                                      >
                                        {formatCurrency(
                                          service.fixedPrice,
                                        )}
                                      </AppText>
                                    </View>
                                  ),
                                )}
                              </View>
                            )}
                          </View>
                        )}
                    </View>
                  )}

                {/* Nút Ký xác nhận */}

                {contract.status ===
                  "pending" && (
                    <View
                      style={
                        styles.signBox
                      }
                    >
                      <View
                        style={
                          styles.signHintBox
                        }
                      >
                        <AppText
                          style={
                            styles.signHint
                          }
                        >
                          {t(
                            "tenantContract.signHint",
                          )}
                        </AppText>
                      </View>

                      <Pressable
                        style={[
                          styles.signButton,
                          isSigning &&
                          styles.signButtonDisabled,
                        ]}
                        onPress={() =>
                          handleSignContract(
                            contract,
                          )
                        }
                        disabled={
                          isSigning
                        }
                      >
                        {isSigning ? (
                          <ActivityIndicator
                            color={
                              theme.background
                            }
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="create-outline"
                              size={19}
                              color={
                                theme.background
                              }
                            />

                            <AppText
                              style={
                                styles.signButtonText
                              }
                            >
                              {t(
                                "tenantContract.sign",
                              )}
                            </AppText>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}

                {/* Thông báo chờ duyệt */}

                {[
                  "reserved",
                  "awaiting_approval",
                ].includes(
                  contract.status,
                ) && (
                    <>
                      <View
                        style={
                          styles.awaitingBox
                        }
                      >
                        <AppText
                          style={
                            styles.awaitingText
                          }
                        >
                          {contract.status ===
                            "reserved"
                            ? t(
                              "contracts.reserved",
                            )
                            : t(
                              "tenantContract.awaitingHint",
                            )}
                        </AppText>
                      </View>

                      {contract
                        .depositPayment
                        ?.required &&
                        contract
                          .depositPayment
                          .status ===
                        "unpaid" && (
                          <View
                            style={
                              styles.depositPaymentCard
                            }
                          >
                            <View
                              style={
                                styles.depositPaymentCopy
                              }
                            >
                              <AppText
                                style={
                                  styles.depositPaymentTitle
                                }
                              >
                                {t(
                                  "tenantContract.depositUnpaid",
                                )}
                              </AppText>

                              <AppText
                                style={
                                  styles.depositPaymentAmount
                                }
                              >
                                {formatCurrency(
                                  unformatNumber(
                                    contract.deposit,
                                  ),
                                )}
                              </AppText>

                              <AppText
                                style={
                                  styles.depositPaymentHint
                                }
                              >
                                {t(
                                  "tenantContract.depositHint",
                                )}
                              </AppText>
                            </View>

                            <Pressable
                              style={[
                                styles.depositPaymentButton,

                                loadingDepositInvoiceId ===
                                contract
                                  .depositPayment
                                  .invoiceId &&
                                styles.signButtonDisabled,
                              ]}
                              disabled={
                                !contract
                                  .depositPayment
                                  .invoiceId ||
                                loadingDepositInvoiceId ===
                                contract
                                  .depositPayment
                                  .invoiceId
                              }
                              onPress={() => {
                                if (
                                  contract
                                    .depositPayment
                                    ?.invoiceId
                                ) {
                                  void openDepositPayment(
                                    contract
                                      .depositPayment
                                      .invoiceId,
                                  );
                                }
                              }}
                            >
                              {loadingDepositInvoiceId ===
                                contract
                                  .depositPayment
                                  .invoiceId ? (
                                <ActivityIndicator
                                  color={
                                    theme.background
                                  }
                                  size="small"
                                />
                              ) : (
                                <>
                                  <Ionicons
                                    name="card-outline"
                                    size={
                                      18
                                    }
                                    color={
                                      theme.background
                                    }
                                  />

                                  <AppText
                                    style={
                                      styles.depositPaymentButtonText
                                    }
                                  >
                                    {t(
                                      "tenantContract.pay",
                                    )}
                                  </AppText>
                                </>
                              )}
                            </Pressable>
                          </View>
                        )}
                    </>
                  )}

                {/* Yêu cầu trả phòng */}

                {contract.status ===
                  "active" && (
                    <View
                      style={
                        styles.signBox
                      }
                    >
                      <Pressable
                        style={[
                          styles.signButton,
                          {
                            backgroundColor:
                              theme.danger,
                          },
                          isLoading &&
                          styles.signButtonDisabled,
                        ]}
                        onPress={() =>
                          handleRequestTerminate(
                            contract,
                          )
                        }
                        disabled={
                          isLoading
                        }
                      >
                        {isLoading ? (
                          <ActivityIndicator
                            color={
                              theme.dangerForeground
                            }
                          />
                        ) : (
                          <>
                            <Ionicons
                              name="exit-outline"
                              size={19}
                              color={
                                theme.dangerForeground
                              }
                            />

                            <AppText
                              style={[
                                styles.signButtonText,
                                {
                                  color:
                                    theme.dangerForeground,
                                },
                              ]}
                            >
                              {t(
                                "tenantContract.terminateTitle",
                              )}
                            </AppText>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}

                {/* Chờ duyệt trả phòng */}

                {contract.status ===
                  "requesting_termination" && (
                    <View
                      style={
                        styles.awaitingBox
                      }
                    >
                      <AppText
                        style={
                          styles.awaitingText
                        }
                      >
                        {t(
                          "tenantContract.terminationHint",
                        )}
                      </AppText>
                    </View>
                  )}

                {/* Xem toàn bộ hợp đồng */}

                <View
                  style={
                    styles.downloadRow
                  }
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xem trước toàn bộ hợp đồng"
                    style={[
                      styles.downloadBtn,
                      {
                        backgroundColor:
                          theme.primarySoft,
                        borderColor:
                          theme.primary,
                      },
                    ]}
                    onPress={() =>
                      setViewerContractId(
                        contract.id,
                      )
                    }
                  >
                    <FeatureIconBox token={FEATURE_ICONS.contracts} size={17} />

                    <AppText
                      style={[
                        styles.downloadBtnText,
                        {
                          color:
                            theme.primary,
                          fontWeight:
                            "700",
                        },
                      ]}
                    >
                      Xem trước toàn bộ hợp đồng
                    </AppText>
                  </Pressable>
                </View>
              </Card>
            </AnimatedEntry>
          );
        }}
      />

      <SignContractWizard
        visible={wizardVisible}
        contract={selectedContract}
        onClose={() =>
          setWizardVisible(false)
        }
        onSign={handleConfirmSign}
      />

      <PaymentModal
        visible={Boolean(
          paymentInvoice,
        )}
        invoice={paymentInvoice}
        onClose={() =>
          setPaymentInvoice(null)
        }
        onConfirm={
          handleDepositPaymentConfirmed
        }
      />

      <ContractViewerModal
        visible={Boolean(
          viewerContractId,
        )}
        contractId={
          viewerContractId
        }
        onClose={() =>
          setViewerContractId(null)
        }
      />
    </>
  );
}

const createStyles = (
  theme: ReturnType<
    typeof useAppTheme
  >["theme"],
) =>
  StyleSheet.create({
    loadingBox: {
      flex: 1,
      backgroundColor:
        theme.background,
      alignItems: "center",
      justifyContent: "center",
    },

    container: {
      flex: 1,
      backgroundColor:
        theme.background,
    },

    content: {
      paddingHorizontal: 22,
      paddingTop: 34,
      paddingBottom: 30,
    },

    emptyListContent: {
      flexGrow: 1,
    },

    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
    },

    emptyHint: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: "700",
    },

    title: {
      fontSize: 24,
      lineHeight: 31,
      fontWeight: "900",
      color: theme.text,
    },

    subtitle: {
      color: theme.muted,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 6,
      marginBottom: 20,
    },

    contractCard: {
      marginBottom: 16,
      marginTop: 12,
      backgroundColor:
        theme.surface,
      borderColor:
        "transparent",
      borderRadius: 20,
    },

    cardHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems:
        "flex-start",
      marginBottom: 14,
    },

    cardHeaderLeft: {
      flex: 1,
      paddingRight: 10,
    },

    roomTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: theme.text,
    },

    tenantText: {
      fontSize: 13,
      color: theme.muted,
      fontWeight: "600",
      marginTop: 3,
    },

    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },

    pendingBadge: {
      backgroundColor:
        "#fef2f2",
      borderColor:
        "#fca5a5",
      borderWidth: 1,
      paddingVertical: 4,
    },

    statusText: {
      fontSize: 11,
      fontWeight: "800",
    },

    pendingText: {
      color: "#dc2626",
      fontSize: 12,
      fontWeight: "800",
    },

    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },

    infoItem: {
      width: "48%",
      backgroundColor:
        theme.surfaceElevated,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },

    infoLabel: {
      fontSize: 11,
      color: theme.muted,
      fontWeight: "600",
      marginBottom: 3,
    },

    infoValue: {
      fontSize: 13,
      color: theme.text,
      fontWeight: "800",
    },

    progressBox: {
      marginTop: 8,
      marginBottom: 8,
    },

    progressBg: {
      height: 8,
      borderRadius: 999,
      backgroundColor:
        theme.primarySoft,
      overflow: "hidden",
    },

    progressFill: {
      height: "100%",
      backgroundColor:
        theme.primary,
      borderRadius: 999,
    },

    progressTextRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      marginTop: 9,
    },

    progressText: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: "700",
    },

    /* ============================= */
    /* PHÍ DỊCH VỤ */
    /* ============================= */

    servicesBox: {
      marginTop: 10,
      paddingTop: 12,
    },

    servicesTitle: {
      fontSize: 15,
      fontWeight: "900",
      color: theme.text,
      marginBottom: 8,
    },

    utilityRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor:
        theme.border,
      gap: 12,
    },

    utilityLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    utilityIconBox: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.surfaceElevated,
    },

    utilityName: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },

    utilitySubText: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "600",
      color: theme.muted,
    },

    utilityPrice: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.text,
      textAlign: "right",
    },

    /* ============================= */
    /* DỊCH VỤ ĐI KÈM BUNG / THU */
    /* ============================= */

    extraServicesWrapper: {
      marginTop: 12,
    },

    extraServicesToggle: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor:
        theme.primarySoft,
      borderWidth: 1,
      borderColor:
        theme.border,
    },

    extraServicesToggleLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    extraServicesToggleIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.surface,
    },

    extraServicesToggleTitle: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.text,
    },

    extraServicesToggleSubtitle: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "600",
      color: theme.muted,
    },

    extraServicesList: {
      marginTop: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor:
        theme.border,
      backgroundColor:
        theme.surface,
      overflow: "hidden",
    },

    extraServiceRow: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor:
        theme.border,
    },

    extraServiceRowLast: {
      borderBottomWidth: 0,
    },

    extraServiceInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    extraServiceCheck: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        theme.primarySoft,
    },

    extraServiceTextBox: {
      flex: 1,
    },

    extraServiceName: {
      fontSize: 13,
      fontWeight: "800",
      color: theme.text,
    },

    extraServiceUnit: {
      marginTop: 2,
      fontSize: 10,
      fontWeight: "600",
      color: theme.muted,
    },

    extraServicePrice: {
      fontSize: 13,
      fontWeight: "900",
      color: theme.primary,
      textAlign: "right",
    },

    signBox: {
      marginTop: 14,
      paddingTop: 14,
    },

    signHintBox: {
      backgroundColor:
        theme.warningSoft,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
    },

    signHint: {
      fontSize: 12,
      color:
        theme.warningForeground,
      fontWeight: "700",
      lineHeight: 20,
    },

    signButton: {
      height: 50,
      backgroundColor:
        theme.primary,
      borderRadius: 16,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      justifyContent: "center",
    },

    signButtonDisabled: {
      opacity: 0.7,
    },

    signButtonText: {
      color:
        theme.background,
      fontSize: 15,
      fontWeight: "900",
    },

    awaitingBox: {
      marginTop: 14,
      paddingTop: 14,
    },

    awaitingText: {
      fontSize: 13,
      color: theme.primary,
      fontWeight: "700",
      lineHeight: 20,
      backgroundColor:
        theme.primarySoft,
      borderRadius: 16,
      padding: 12,
      overflow: "hidden",
    },

    depositPaymentCard: {
      marginTop: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor:
        theme.warningSoft,
      gap: 12,
    },

    depositPaymentCopy: {
      gap: 4,
    },

    depositPaymentTitle: {
      color:
        theme.warningForeground,
      fontSize: 14,
      fontWeight: "900",
    },

    depositPaymentAmount: {
      color: theme.text,
      fontSize: 20,
      fontWeight: "900",
    },

    depositPaymentHint: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 18,
    },

    depositPaymentButton: {
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor:
        theme.primary,
      flexDirection: "row",
      gap: 8,
    },

    depositPaymentButtonText: {
      color:
        theme.background,
      fontSize: 14,
      fontWeight: "900",
    },

    downloadRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        theme.border,
    },

    downloadBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
    },

    downloadBtnText: {
      fontSize: 12,
      fontWeight: "800",
    },
  });