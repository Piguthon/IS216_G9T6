<template>
  <!-- The MRT platform scene, used on the home page and while results load. -->
  <div aria-hidden="true">
    <div class="platform">
      <img class="pf-train" src="../assets/scene/mrt-train.svg" alt="" />
      <div class="platform-doors"></div>
    </div>
    <div class="floor"></div>
  </div>
</template>

<style scoped>
.platform {
  position: relative;
  overflow: hidden;
  height: 150px;
  background-color: #14161a;
}

.pf-train {
  position: absolute;
  bottom: 8px;
  left: -2500px;
  height: 100px;
  max-width: none;
  animation: pf-pass 13s linear infinite;
}

.platform-doors {
  position: absolute;
  inset: 0;
  background: url('../assets/scene/platform-doors.svg') repeat-x center bottom / auto 100%;
}

.floor {
  height: 46px;
  border-top: 6px solid #6b737a;
  background-color: #b9b4a8;
}

.floor::before {
  content: '';
  display: block;
  height: 10px;
  margin-top: 8px;
  background-color: #f2c230;
}

@keyframes pf-pass {
  from {
    left: -2500px;
  }
  to {
    left: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pf-train {
    left: 5%;
    animation: none;
  }
}
</style>
