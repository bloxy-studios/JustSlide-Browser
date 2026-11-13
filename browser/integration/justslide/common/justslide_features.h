// Copyright 2026 Bloxy Studios.
#ifndef JUSTSLIDE_COMMON_JUSTSLIDE_FEATURES_H_
#define JUSTSLIDE_COMMON_JUSTSLIDE_FEATURES_H_

#include "base/feature_list.h"

namespace justslide::features {

// Replaces the native vertical tab strip contents with the trusted sidebar
// WebUI. Disabled => stock Chromium UI (used for the baseline comparison).
BASE_DECLARE_FEATURE(kJustSlideSidebar);

// Local authenticated automation endpoint. Off unless the user enables it.
BASE_DECLARE_FEATURE(kJustSlideLocalAutomation);

}  // namespace justslide::features

#endif  // JUSTSLIDE_COMMON_JUSTSLIDE_FEATURES_H_
