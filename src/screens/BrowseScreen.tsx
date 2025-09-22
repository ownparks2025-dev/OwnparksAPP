import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { NavigationProps, ParkingLot } from '../types';
import { getParkingLots } from '../services/firebase';
import { formatCurrency, formatPercentage } from '../utils/validation';

const BrowseScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [filteredLots, setFilteredLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'highRoi' | 'lowPrice'>('all');

  useEffect(() => {
    loadParkingLots();
  }, []);

  useEffect(() => {
    filterLots();
  }, [searchQuery, selectedFilter, parkingLots]);

  const loadParkingLots = async () => {
    try {
      setLoading(true);
      const lots = await getParkingLots();
      setParkingLots(lots);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load parking lots');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadParkingLots();
    setRefreshing(false);
  };

  const filterLots = () => {
    let filtered = parkingLots;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(lot =>
        lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lot.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    switch (selectedFilter) {
      case 'highRoi':
        filtered = filtered.filter(lot => lot.roi >= 12);
        break;
      case 'lowPrice':
        filtered = filtered.filter(lot => lot.price <= 50000);
        break;
      default:
        break;
    }

    setFilteredLots(filtered);
  };

  const handleLotPress = (lot: ParkingLot) => {
    navigation.navigate('LotDetails', { lotId: lot.id });
  };

  const renderParkingLot = ({ item }: { item: ParkingLot }) => (
    <TouchableOpacity
      style={styles.lotCard}
      onPress={() => handleLotPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.lotCardTop}>
        <View style={styles.lotImageContainer}>
          <View style={styles.lotImagePlaceholder}>
            <Text style={styles.lotImageText}>🏢</Text>
          </View>
        </View>
        
        <View style={styles.lotInfo}>
          <Text style={styles.lotName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.lotLocation} numberOfLines={1}>
            📍 {item.location}
          </Text>
          
          <View style={styles.lotStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Price</Text>
              <Text style={styles.statValue}>{formatCurrency(item.price)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>ROI</Text>
              <Text style={[styles.statValue, styles.roiValue]}>
                {formatPercentage(item.roi)}
              </Text>
            </View>
          </View>
          
          <View style={styles.availabilityContainer}>
            <View style={[styles.availabilityDot, { backgroundColor: item.availability ? '#34C759' : '#FF3B30' }]} />
            <Text style={styles.availabilityText}>
              {item.availability ? 'Available' : 'Fully Invested'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.lotCardBottom}>
        <TouchableOpacity
          style={[styles.investButton, !item.availability && styles.disabledButton]}
          onPress={() => handleLotPress(item)}
          disabled={!item.availability}
        >
          <Text style={styles.investButtonText}>
            {item.availability ? 'Invest Now' : 'Full'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🚗</Text>
      <Text style={styles.emptyStateTitle}>No Parking Lots Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        {searchQuery.trim() 
          ? 'Try adjusting your search criteria'
          : 'Check back later for new investment opportunities'
        }
      </Text>
    </View>
  );

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse Parking Spots</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileButtonText}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'all' && styles.activeFilterTab]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.filterTabText, selectedFilter === 'all' && styles.activeFilterTabText]}>
            All Lots
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'highRoi' && styles.activeFilterTab]}
          onPress={() => setSelectedFilter('highRoi')}
        >
          <Text style={[styles.filterTabText, selectedFilter === 'highRoi' && styles.activeFilterTabText]}>
            High ROI (12%+)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, selectedFilter === 'lowPrice' && styles.activeFilterTab]}
          onPress={() => setSelectedFilter('lowPrice')}
        >
          <Text style={[styles.filterTabText, selectedFilter === 'lowPrice' && styles.activeFilterTabText]}>
            Low Price (≤50K)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredLots.length} parking lot{filteredLots.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Parking Lots List */}
      <FlatList
        data={filteredLots}
        renderItem={renderParkingLot}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    fontSize: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeFilterTabText: {
    color: 'white',
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 20,
  },
  lotCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lotCardTop: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  lotCardBottom: {
    alignItems: 'flex-end',
  },
  lotImageContainer: {
    marginRight: 16,
  },
  lotImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lotImageText: {
    fontSize: 24,
  },
  lotInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  lotName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  lotLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  lotStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    marginRight: 20,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  roiValue: {
    color: '#34C759',
  },
  availabilityContainer: {
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
    color: '#666',
  },
  investButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  investButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default BrowseScreen;


