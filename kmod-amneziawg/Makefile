include $(TOPDIR)/rules.mk
include $(INCLUDE_DIR)/kernel.mk

PKG_NAME:=kmod-amneziawg
PKG_VERSION:=1.0.20260210
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/amnezia-vpn/amneziawg-linux-kernel-module.git
# Version: latest stable release tag
PKG_SOURCE_VERSION:=v$(PKG_VERSION)
PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)
MAKE_PATH:=src

include $(INCLUDE_DIR)/package.mk

# === ДОБАВЬТЕ ЭТОТ БЛОК ===
# Принудительная установка vermagic из переменной окружения
ifneq ($(PKG_VERMAGIC),)
  PKG_EXTRA_VERMAGIC:=$(PKG_VERMAGIC)
endif

define KernelPackage/amneziawg
	SECTION:=kernel
	CATEGORY:=Kernel modules
	SUBMENU:=Network Support
	TITLE:=AmneziaWG VPN Kernel Module
	FILES:=$(PKG_BUILD_DIR)/$(MAKE_PATH)/amneziawg.ko
	DEPENDS:= \
		+kmod-udptunnel4 \
		+kmod-udptunnel6 \
		+kmod-crypto-lib-chacha20poly1305 \
		+kmod-crypto-lib-curve25519
	# Добавьте эту строку для vermagic
	EXTRA_DEPENDS:=kernel (=$(LINUX_VERSION)~$(PKG_VERMAGIC))
endef

define Build/Prepare
	$(call Build/Prepare/Default)
	mkdir -p $(PKG_BUILD_DIR)/$(MAKE_PATH)/kernel
	$(CP) $(LINUX_DIR)/* $(PKG_BUILD_DIR)/$(MAKE_PATH)/kernel/
endef

define Build/Compile
	# === ДОБАВЬТЕ ЭТИ СТРОКИ ===
	# Принудительно устанавливаем vermagic в модуле
	if [ -n "$(PKG_EXTRA_VERMAGIC)" ]; then \
		echo "Setting vermagic to: $(PKG_EXTRA_VERMAGIC)"; \
		echo 'MODULE_VERMAGIC_$(PKG_EXTRA_VERMAGIC) :=' > $(PKG_BUILD_DIR)/$(MAKE_PATH)/vermagic.h; \
	fi
	
	$(MAKE_VARS) $(MAKE) -C "$(LINUX_DIR)" \
		$(KERNEL_MAKE_FLAGS) \
		M="$(PKG_BUILD_DIR)/$(MAKE_PATH)" \
		EXTRA_CFLAGS="$(BUILDFLAGS) -DCOMPAT_CANNOT_USE_SYSTEM_CRYPTO" \
		WIREGUARD_VERSION="$(WIREGUARD_VERSION)" \
		modules
endef

$(eval $(call KernelPackage,amneziawg))
