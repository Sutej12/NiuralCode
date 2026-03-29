from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SchedulingViewSet

router = DefaultRouter()
router.register(r'', SchedulingViewSet, basename='scheduling')

urlpatterns = [
    path('', include(router.urls)),
]
