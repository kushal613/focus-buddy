import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
} from 'react-native';
import { DISTRACTING_APPS, APP_CATEGORIES, AppItem } from '../data/appList';
import { colors, spacing, borderRadius, typography } from '../theme/colors';

interface AppSelectorProps {
  selectedApps: string[];
  onAppToggle: (appId: string) => void;
  onCustomAppAdd: (appName: string) => void;
}

const AppSelector: React.FC<AppSelectorProps> = ({
  selectedApps,
  onAppToggle,
  onCustomAppAdd,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customAppName, setCustomAppName] = useState('');

  // Filter apps based on search and category
  const filteredApps = useMemo(() => {
    let filtered = DISTRACTING_APPS;
    
    if (searchQuery) {
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(app => app.category === selectedCategory);
    }
    
    return filtered;
  }, [searchQuery, selectedCategory]);

  const handleCustomAppAdd = () => {
    if (customAppName.trim()) {
      onCustomAppAdd(customAppName.trim());
      setCustomAppName('');
    }
  };

  const renderAppItem = ({ item }: { item: AppItem }) => {
    const isSelected = selectedApps.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.appItem, isSelected && styles.appItemSelected]}
        onPress={() => onAppToggle(item.id)}
      >
        <View style={styles.appInfo}>
          <Text style={styles.appIcon}>{item.icon}</Text>
          <Text style={[styles.appName, isSelected && styles.appNameSelected]}>
            {item.name}
          </Text>
        </View>
        <View style={[styles.addButton, isSelected && styles.addButtonSelected]}>
          <Text style={[styles.addButtonText, isSelected && styles.addButtonTextSelected]}>
            {isSelected ? '✓' : '+'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryContainer}
      contentContainerStyle={styles.categoryContent}
    >
      <TouchableOpacity
        style={[
          styles.categoryChip,
          !selectedCategory && styles.categoryChipSelected
        ]}
        onPress={() => setSelectedCategory(null)}
      >
        <Text style={[
          styles.categoryChipText,
          !selectedCategory && styles.categoryChipTextSelected
        ]}>
          All
        </Text>
      </TouchableOpacity>
      
      {Object.entries(APP_CATEGORIES).map(([key, label]) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.categoryChip,
            selectedCategory === key && styles.categoryChipSelected
          ]}
          onPress={() => setSelectedCategory(key)}
        >
          <Text style={[
            styles.categoryChipText,
            selectedCategory === key && styles.categoryChipTextSelected
          ]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search apps..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Category Filters */}
      {renderCategoryFilter()}

      {/* App List */}
      <View style={styles.appList}>
        {filteredApps.map((item) => (
          <View key={item.id}>
            {renderAppItem({ item })}
          </View>
        ))}
      </View>

      {/* Custom App Input */}
      <View style={styles.customAppContainer}>
        <Text style={styles.customAppLabel}>Add Custom App</Text>
        <View style={styles.customAppInputContainer}>
          <TextInput
            style={styles.customAppInput}
            placeholder="Enter app name..."
            value={customAppName}
            onChangeText={setCustomAppName}
            onSubmitEditing={handleCustomAppAdd}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={[styles.customAddButton, !customAppName.trim() && styles.customAddButtonDisabled]}
            onPress={handleCustomAppAdd}
            disabled={!customAppName.trim()}
          >
            <Text style={styles.customAddButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    marginBottom: spacing.lg,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.lg,
    color: colors.text,
  },
  categoryContainer: {
    marginBottom: spacing.lg,
  },
  categoryContent: {
    paddingHorizontal: spacing.xs,
  },
  categoryChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: typography.fontSize.md,
    color: colors.textMuted,
    fontWeight: typography.fontWeight.medium,
  },
  categoryChipTextSelected: {
    color: colors.panel,
  },
  appList: {
    flex: 1,
  },
  appListContent: {
    paddingBottom: spacing.lg,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  appItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.hover,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  appName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  appNameSelected: {
    color: colors.primaryHover,
    fontWeight: typography.fontWeight.semibold,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButtonSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    color: colors.textMuted,
  },
  addButtonTextSelected: {
    color: colors.panel,
  },
  customAppContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  customAppLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  customAppInputContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customAppInput: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: typography.fontSize.lg,
    color: colors.text,
  },
  customAddButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAddButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  customAddButtonText: {
    color: colors.panel,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default AppSelector;
