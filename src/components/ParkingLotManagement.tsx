import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  Switch,
} from 'react-native';
import { 
  getAllParkingLots, 
  createParkingLot, 
  updateParkingLot, 
  deleteParkingLot 
} from '../services/admin';
import { ParkingLot } from '../types';

interface ParkingLotFormData {
  name: string;
  location: string;
  price: string;
  roi: string;
  availability: boolean;
  details: string;
  images: string[];

  totalLots: string;
}

const ParkingLotManagement: React.FC = () => {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [filteredLots, setFilteredLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLot, setEditingLot] = useState<ParkingLot | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  const [formData, setFormData] = useState<ParkingLotFormData>({
    name: '',
    location: '',
    price: '',
    roi: '',
    availability: true,
    details: '',
    images: [],
  });

  const loadParkingLots = async () => {
    try {
      const lots = await getAllParkingLots();
      setParkingLots(lots);
      filterLots(lots, searchQuery, showOnlyAvailable);
    } catch (error: any) {
      Alert.alert('Error', `Failed to load parking lots: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterLots = (lots: ParkingLot[], search: string, onlyAvailable: boolean) => {
    let filtered = lots;

    // Filter by availability
    if (onlyAvailable) {
      filtered = filtered.filter(lot => lot.availability);
    }

    // Filter by search query
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(lot => 
        lot.name.toLowerCase().includes(searchLower) ||
        lot.location.toLowerCase().includes(searchLower)
      );
    }

    setFilteredLots(filtered);
  };

  useEffect(() => {
    loadParkingLots();
  }, []);

  useEffect(() => {
    filterLots(parkingLots, searchQuery, showOnlyAvailable);
  }, [parkingLots, searchQuery, showOnlyAvailable]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadParkingLots();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      price: '',
      roi: '',
      availability: true,
      details: '',
      images: [],
      totalLots: '',
    });
    setEditingLot(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (lot: ParkingLot) => {
    setEditingLot(lot);
    setFormData({
      name: lot.name,
      location: lot.location,
      price: lot.price.toString(),
      roi: lot.roi.toString(),
      availability: lot.availability,
      details: lot.details,
      images: lot.images || [],
      totalLots: lot.totalLots?.toString() || '1',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.location.trim() || !formData.price || !formData.roi || !formData.totalLots) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    const price = parseFloat(formData.price);
    const roi = parseFloat(formData.roi);
    const totalLots = parseInt(formData.totalLots);

    if (isNaN(price) || price <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }

    if (isNaN(roi) || roi < 0) {
      Alert.alert('Validation Error', 'Please enter a valid ROI percentage');
      return;
    }

    if (isNaN(totalLots) || totalLots <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid number of lots');
      return;
    }

    try {
      setActionLoading('save');
      
      const lotData: Omit<ParkingLot, 'id'> = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        price,
        roi,
        availability: formData.availability,
        details: formData.details.trim(),
        images: formData.images,
        totalLots,
        availableLots: totalLots, // Initially all lots are available
      };

      if (editingLot) {
        // Update existing lot
        await updateParkingLot(editingLot.id, lotData);
        
        // Update local state
        setParkingLots(prevLots =>
          prevLots.map(lot =>
            lot.id === editingLot.id ? { ...lot, ...lotData } : lot
          )
        );
        
        Alert.alert('Success', 'Parking lot updated successfully');
      } else {
        // Create new lot
        const newLotId = await createParkingLot(lotData);
        
        // Add to local state
        const newLot: ParkingLot = { id: newLotId, ...lotData };
        setParkingLots(prevLots => [newLot, ...prevLots]);
        
        Alert.alert('Success', 'Parking lot created successfully');
      }
      
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      Alert.alert('Error', `Failed to save parking lot: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (lotId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this parking lot? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(`delete-${lotId}`);
              await deleteParkingLot(lotId);
              
              // Remove from local state
              setParkingLots(prevLots => prevLots.filter(lot => lot.id !== lotId));
              
              Alert.alert('Success', 'Parking lot deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', `Failed to delete parking lot: ${error.message}`);
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const toggleAvailability = async (lotId: string, currentStatus: boolean) => {
    try {
      setActionLoading(`toggle-${lotId}`);
      await updateParkingLot(lotId, { availability: !currentStatus });
      
      // Update local state
      setParkingLots(prevLots =>
        prevLots.map(lot =>
          lot.id === lotId ? { ...lot, availability: !currentStatus } : lot
        )
      );
      
      Alert.alert('Success', `Parking lot ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
    } catch (error: any) {
      Alert.alert('Error', `Failed to update availability: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading parking lots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Add Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            Parking Lots ({filteredLots.length})
          </Text>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Show available only:</Text>
            <Switch
              value={showOnlyAvailable}
              onValueChange={setShowOnlyAvailable}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={showOnlyAvailable ? '#007AFF' : '#f4f3f4'}
            />
          </View>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={openCreateModal}
        >
          <Text style={styles.addButtonText}>+ Add Lot</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Parking Lots List */}
      <ScrollView
        style={styles.lotsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredLots.map((lot) => (
          <View key={lot.id} style={styles.lotCard}>
            <View style={styles.lotHeader}>
              <View style={styles.lotHeaderLeft}>
                <Text style={styles.lotName}>{lot.name}</Text>
                <Text style={styles.lotLocation}>📍 {lot.location}</Text>
              </View>
              <View style={styles.availabilityBadge}>
                <View style={[
                  styles.availabilityDot,
                  { backgroundColor: lot.availability ? '#34C759' : '#FF3B30' }
                ]} />
                <Text style={[
                  styles.availabilityText,
                  { color: lot.availability ? '#34C759' : '#FF3B30' }
                ]}>
                  {lot.availability ? 'Available' : 'Occupied'}
                </Text>
              </View>
            </View>

            <View style={styles.lotDetails}>
              <View style={styles.lotMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Price</Text>
                  <Text style={styles.metricValue}>{formatCurrency(lot.price)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>ROI</Text>
                  <Text style={styles.metricValue}>{lot.roi}%</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Available Lots</Text>
                  <Text style={styles.metricValue}>{lot.availableLots || lot.totalLots || 1}/{lot.totalLots || 1}</Text>
                </View>
              </View>
              
              {lot.details && (
                <Text style={styles.lotDescription} numberOfLines={2}>
                  {lot.details}
                </Text>
              )}
            </View>

            <View style={styles.lotActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => openEditModal(lot)}
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  lot.availability ? styles.disableButton : styles.enableButton
                ]}
                onPress={() => toggleAvailability(lot.id, lot.availability)}
                disabled={actionLoading === `toggle-${lot.id}`}
              >
                {actionLoading === `toggle-${lot.id}` ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.actionButtonText}>
                    {lot.availability ? 'Disable' : 'Enable'}
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(lot.id)}
                disabled={actionLoading === `delete-${lot.id}`}
              >
                {actionLoading === `delete-${lot.id}` ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.actionButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredLots.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No parking lots found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Create your first parking lot to get started'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingLot ? 'Edit Parking Lot' : 'Add New Parking Lot'}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter parking lot name"
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Location *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter location"
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Price (₹) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="0"
                  value={formData.price}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>ROI (%) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="0"
                  value={formData.roi}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, roi: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Number of Lots *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter total number of lots available"
                value={formData.totalLots}
                onChangeText={(text) => setFormData(prev => ({ ...prev, totalLots: text }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Details</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Enter parking lot details"
                value={formData.details}
                onChangeText={(text) => setFormData(prev => ({ ...prev, details: text }))}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Available for Investment</Text>
                <Switch
                  value={formData.availability}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value }))}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={formData.availability ? '#007AFF' : '#f4f3f4'}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalActionButton, styles.saveButton]}
                onPress={handleSave}
                disabled={actionLoading === 'save'}
              >
                {actionLoading === 'save' ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingLot ? 'Update' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  lotsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lotCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 15,
    paddingBottom: 10,
  },
  lotHeaderLeft: {
    flex: 1,
  },
  lotName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  lotLocation: {
    fontSize: 14,
    color: '#666',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lotDetails: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  lotMetrics: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  lotDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  lotActions: {
    flexDirection: 'row',
    padding: 15,
    paddingTop: 0,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  enableButton: {
    backgroundColor: '#34C759',
  },
  disableButton: {
    backgroundColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  modalCloseText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formGroup: {
    marginTop: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
    paddingVertical: 20,
    marginTop: 20,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ParkingLotManagement;
